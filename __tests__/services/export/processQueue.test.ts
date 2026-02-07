import { beforeEach, describe, expect, it, vi } from 'vitest';
import { driveConfigService } from '../../../src/services/config/DriveConfigService';
import { exportConfigService } from '../../../src/services/config/ExportConfigService';
import { queueManager } from '../../../src/services/export/QueueManager';
import { exportToCSV } from '../../../src/services/export/csv';
import { exportToJSON } from '../../../src/services/export/json';
import { processExportQueue } from '../../../src/services/export/service';
import { exportToSpreadsheet } from '../../../src/services/export/sheets';
import { getNetworkStatus } from '../../../src/services/networkService';
import { storageAdapterFactory } from '../../../src/services/storage/storageAdapterFactory';
import { useOfflineStore } from '../../../src/stores/offlineStore';
import { err, ok } from '../../../src/types/result';

// Mocks
vi.mock('../../../src/services/networkService', () => ({
  getNetworkStatus: vi.fn(),
  subscribeToNetworkChanges: vi.fn()
}));
vi.mock('../../../src/services/export/QueueManager', () => ({
  queueManager: {
    getQueue: vi.fn(),
    removeFromQueue: vi.fn(),
    incrementRetry: vi.fn(),
    hasExceededMaxRetries: vi.fn(),
    addToQueue: vi.fn()
  }
}));
vi.mock('../../../src/services/storage/storageAdapterFactory', () => ({
  storageAdapterFactory: {
    createStorageAdapter: vi.fn(),
    createSpreadsheetAdapter: vi.fn(),
    createInitializer: vi.fn(),
    createFolderOperations: vi.fn(),
    createFileOperations: vi.fn()
  }
}));
vi.mock('../../../src/services/config/ExportConfigService', () => ({
  exportConfigService: {
    loadExportFormats: vi.fn(),
    loadExportSheetAsPdf: vi.fn()
  }
}));
vi.mock('../../../src/services/config/DriveConfigService', () => ({
  driveConfigService: {
    loadDriveConfig: vi.fn()
  }
}));
vi.mock('../../../src/services/export/sheets', () => ({
  exportToSpreadsheet: vi.fn()
}));
vi.mock('../../../src/services/debugLogService', () => ({
  addDebugLog: vi.fn()
}));
vi.mock('../../../src/services/storage/googleDrive', () => ({
  getFolder: vi.fn(),
  DEFAULT_FOLDER_NAME: 'ConnectHealth'
}));
vi.mock('../../../src/services/export/csv', () => ({
  exportToCSV: vi.fn()
}));
vi.mock('../../../src/services/export/json', () => ({
  exportToJSON: vi.fn()
}));

describe('ExportService - processExportQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOfflineStore.setState({ pendingCount: 0 });

    // デフォルトのモック動作
    vi.mocked(getNetworkStatus).mockResolvedValue('online');
    vi.mocked(queueManager.getQueue).mockResolvedValue([]);
    vi.mocked(queueManager.hasExceededMaxRetries).mockReturnValue(false);

    // Config系モック
    vi.mocked(exportConfigService.loadExportFormats).mockResolvedValue(['googleSheets']);
    vi.mocked(exportConfigService.loadExportSheetAsPdf).mockResolvedValue(false);
    vi.mocked(driveConfigService.loadDriveConfig).mockResolvedValue({
      folderId: 'folder-id',
      folderName: 'folder-name'
    });

    // アダプタのモック
    vi.mocked(storageAdapterFactory.createStorageAdapter).mockReturnValue({
      initialize: vi.fn().mockResolvedValue(true), // Initializable so boolean or Promise<boolean>
      findOrCreateFolder: vi.fn().mockResolvedValue(ok('folder-id')),
      defaultFolderName: 'ConnectHealth'
    } as any);

    vi.mocked(storageAdapterFactory.createInitializer).mockReturnValue({
      initialize: vi.fn().mockResolvedValue(true)
    });

    vi.mocked(storageAdapterFactory.createFolderOperations).mockReturnValue({
      findOrCreateFolder: vi.fn().mockResolvedValue(ok('folder-id')),
      checkFolderExists: vi.fn().mockResolvedValue(ok(true)),
      defaultFolderName: 'ConnectHealth'
    });

    vi.mocked(storageAdapterFactory.createFileOperations).mockReturnValue({
      findFile: vi.fn(),
      uploadFile: vi.fn(),
      updateFile: vi.fn(),
      downloadFileContent: vi.fn()
    });

    vi.mocked(storageAdapterFactory.createSpreadsheetAdapter).mockReturnValue({} as any);

    // エクスポート処理の成功モック (Result型を返す)
    vi.mocked(exportToSpreadsheet).mockResolvedValue(
      ok({
        exportedSheets: [{ spreadsheetId: 'sheet-id', year: 2023 }],
        folderId: 'folder-id'
      })
    );
    vi.mocked(exportToCSV).mockResolvedValue(ok('csv-id'));
    vi.mocked(exportToJSON).mockResolvedValue(ok('json-id'));
  });

  it('should skip processing if offline', async () => {
    // Arrange
    vi.mocked(getNetworkStatus).mockResolvedValue('offline');
    vi.mocked(queueManager.getQueue).mockResolvedValue([{ id: '1' }] as any);

    // Act
    const result = await processExportQueue();

    // Assert
    expect(result.successCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    // processSingleEntry is not called
    expect(exportToSpreadsheet).not.toHaveBeenCalled();
  });

  it('should process queue items successfully', async () => {
    // Arrange
    const mockEntry = {
      id: 'entry-1',
      healthData: { steps: [] },
      selectedTags: ['steps'],
      retryCount: 0,
      exportConfig: { formats: ['googleSheets'], targetFolder: { id: 'f1' } }
    };
    vi.mocked(queueManager.getQueue)
      .mockResolvedValueOnce([mockEntry] as any)
      .mockResolvedValue([]); // Processing -> Empty

    // Act
    const result = await processExportQueue();

    // Assert
    expect(result.successCount).toBe(1);
    expect(queueManager.removeFromQueue).toHaveBeenCalledWith('entry-1');
    expect(exportToSpreadsheet).toHaveBeenCalled();
  });

  it('should handle max retries exceeded', async () => {
    // Arrange
    const mockEntry = {
      id: 'entry-2',
      retryCount: 3
    };
    vi.mocked(queueManager.getQueue)
      .mockResolvedValueOnce([mockEntry] as any)
      .mockResolvedValue([]);
    vi.mocked(queueManager.hasExceededMaxRetries).mockReturnValue(true);

    // Act
    const result = await processExportQueue();

    // Assert
    expect(result.skippedCount).toBe(1);
    expect(queueManager.removeFromQueue).toHaveBeenCalledWith('entry-2');
    expect(exportToSpreadsheet).not.toHaveBeenCalled();
  });

  it('should increment retry count on failure', async () => {
    // Arrange
    const mockEntry = {
      id: 'entry-3',
      healthData: {},
      selectedTags: [],
      retryCount: 0,
      exportConfig: { formats: ['googleSheets'], targetFolder: { id: 'f1' } }
    };
    vi.mocked(queueManager.getQueue)
      .mockResolvedValueOnce([mockEntry] as any)
      .mockResolvedValue(['entry-3'] as any); // Still in queue
    vi.mocked(exportToSpreadsheet).mockResolvedValue(err('API Error'));

    // Act
    const result = await processExportQueue();

    // Assert
    expect(result.failCount).toBe(1);
    expect(queueManager.incrementRetry).toHaveBeenCalledWith('entry-3', expect.any(String));
    expect(queueManager.removeFromQueue).not.toHaveBeenCalledWith('entry-3');
  });

  it('should stop processing if network goes offline during processing', async () => {
    // Arrange
    const entries = [
      { id: 'e1', exportConfig: { formats: ['googleSheets'] } },
      { id: 'e2', exportConfig: { formats: ['googleSheets'] } }
    ];
    vi.mocked(queueManager.getQueue).mockResolvedValueOnce(entries as any);

    // e1 fails -> check network -> offline -> break
    vi.mocked(exportToSpreadsheet).mockResolvedValue(err('Some failure'));

    // First check (start): online
    // Second check (after failure): offline
    vi.mocked(getNetworkStatus).mockResolvedValueOnce('online').mockResolvedValueOnce('offline');

    // Act
    const result = await processExportQueue();

    // Assert
    expect(result.failCount).toBe(1);
    expect(result.successCount).toBe(0);
    // e2 should not be processed
    expect(exportToSpreadsheet).toHaveBeenCalledTimes(1);
  });

  it('should export to multiple formats (CSV, JSON, Sheets)', async () => {
    // Arrange
    const mockEntry = {
      id: 'entry-multi',
      healthData: { steps: [] },
      selectedTags: ['steps'],
      retryCount: 0,
      exportConfig: {
        formats: ['googleSheets', 'csv', 'json'],
        targetFolder: { id: 'f1' }
      }
    };
    vi.mocked(queueManager.getQueue)
      .mockResolvedValueOnce([mockEntry] as any)
      .mockResolvedValue([]);

    // Mocks for CSV/JSON (already set in beforeEach but explicit here for clarity)
    vi.mocked(exportToCSV).mockResolvedValue(ok('csv-id'));
    vi.mocked(exportToJSON).mockResolvedValue(ok('json-id'));

    // Act
    const result = await processExportQueue();

    // Assert
    expect(result.successCount).toBe(1);
    expect(exportToSpreadsheet).toHaveBeenCalled();
    expect(exportToCSV).toHaveBeenCalled();
    expect(exportToJSON).toHaveBeenCalled();
  });

  it('should utilize syncDateRange if provided', async () => {
    // Arrange
    const mockEntry = {
      id: 'entry-dates',
      healthData: { steps: [] },
      selectedTags: ['steps'],
      syncDateRange: ['2023-01-01', '2023-01-02'],
      retryCount: 0,
      exportConfig: { formats: ['googleSheets'] }
    };
    vi.mocked(queueManager.getQueue)
      .mockResolvedValueOnce([mockEntry] as any)
      .mockResolvedValue([]);

    // Act
    await processExportQueue();

    // Assert
    expect(exportToSpreadsheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      // 4th arg is originalDates Set
      expect.any(Set)
    );
    const callArgs = vi.mocked(exportToSpreadsheet).mock.calls[0];
    const passedSet = callArgs[3] as Set<string>;
    expect(passedSet.has('2023-01-01')).toBe(true);
    expect(passedSet.has('2023-01-02')).toBe(true);
  });

  it('should handle context preparation failure', async () => {
    // Arrange
    const mockEntry = { id: 'entry-fail-ctx', exportConfig: { formats: ['googleSheets'] } };
    vi.mocked(queueManager.getQueue)
      .mockResolvedValueOnce([mockEntry] as any)
      .mockResolvedValue([]);

    // Mock initialize failure
    const mockInitializer = storageAdapterFactory.createInitializer();
    vi.mocked(mockInitializer.initialize).mockResolvedValue(false);

    // Act
    const result = await processExportQueue();

    // Assert
    expect(result.failCount).toBe(1);
    expect(result.errors[0]).toContain('No access context');
  });

  it('should handle unexpected exception during processing', async () => {
    // Arrange
    const mockEntry = { id: 'entry-except', exportConfig: { formats: ['googleSheets'] } };
    vi.mocked(queueManager.getQueue)
      .mockResolvedValueOnce([mockEntry] as any)
      .mockResolvedValue([]);

    vi.mocked(exportToSpreadsheet).mockRejectedValue(new Error('Unexpected Crash'));

    // Act
    const result = await processExportQueue();

    // Assert
    expect(result.failCount).toBe(1);
    // Should increment retry
    expect(queueManager.incrementRetry).toHaveBeenCalledWith(
      'entry-except',
      expect.stringContaining('Unexpected Crash')
    );
  });
});
