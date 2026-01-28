import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadDriveConfig } from '../../../src/services/config/driveConfig';
import { loadExportFormats, loadExportSheetAsPdf } from '../../../src/services/config/exportConfig';
import {
  getQueue,
  hasExceededMaxRetries,
  incrementRetry,
  removeFromQueue
} from '../../../src/services/export/queue-storage';
import { processExportQueue } from '../../../src/services/export/service';
import { exportToSpreadsheet } from '../../../src/services/export/sheets';
import { getNetworkStatus } from '../../../src/services/networkService';
import {
  createFileOperations,
  createFolderOperations,
  createInitializer,
  createSpreadsheetAdapter,
  createStorageAdapter
} from '../../../src/services/storage/adapterFactory';
import { useOfflineStore } from '../../../src/stores/offlineStore';

// Mocks
vi.mock('../../../src/services/networkService', () => ({
  getNetworkStatus: vi.fn(),
  subscribeToNetworkChanges: vi.fn(),
  isInternetReachable: vi.fn()
}));
vi.mock('../../../src/services/export/queue-storage', () => ({
  getQueue: vi.fn(),
  removeFromQueue: vi.fn(),
  incrementRetry: vi.fn(),
  hasExceededMaxRetries: vi.fn(),
  addToQueue: vi.fn()
}));
vi.mock('../../../src/services/storage/adapterFactory', () => ({
  createStorageAdapter: vi.fn(),
  createSpreadsheetAdapter: vi.fn(),
  createInitializer: vi.fn(),
  createFolderOperations: vi.fn(),
  createFileOperations: vi.fn()
}));
vi.mock('../../../src/services/config/exportConfig', () => ({
  loadExportFormats: vi.fn(),
  loadExportSheetAsPdf: vi.fn(),
  createDefaultExportConfig: vi.fn()
}));
vi.mock('../../../src/services/config/driveConfig', () => ({
  loadDriveConfig: vi.fn()
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

describe('ExportService - processExportQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOfflineStore.setState({ pendingCount: 0 });

    // デフォルトのモック動作
    vi.mocked(getNetworkStatus).mockResolvedValue('online');
    vi.mocked(getQueue).mockResolvedValue([]);
    vi.mocked(hasExceededMaxRetries).mockReturnValue(false);

    // Config系モック
    vi.mocked(loadExportFormats).mockResolvedValue(['googleSheets']);
    vi.mocked(loadExportSheetAsPdf).mockResolvedValue(false);
    vi.mocked(loadDriveConfig).mockResolvedValue({
      folderId: 'folder-id',
      folderName: 'folder-name'
    });

    // アダプタのモック
    vi.mocked(createStorageAdapter).mockReturnValue({
      initialize: vi.fn().mockResolvedValue(true),
      findOrCreateFolder: vi.fn().mockResolvedValue('folder-id'),
      defaultFolderName: 'ConnectHealth'
    } as any);

    vi.mocked(createInitializer).mockReturnValue({
      initialize: vi.fn().mockResolvedValue(true)
    });

    vi.mocked(createFolderOperations).mockReturnValue({
      findOrCreateFolder: vi.fn().mockResolvedValue('folder-id'),
      checkFolderExists: vi.fn().mockResolvedValue(true),
      defaultFolderName: 'ConnectHealth'
    });

    vi.mocked(createFileOperations).mockReturnValue({
      findFile: vi.fn(),
      uploadFile: vi.fn(),
      updateFile: vi.fn(),
      downloadFileContent: vi.fn()
    });

    vi.mocked(createSpreadsheetAdapter).mockReturnValue({} as any);

    // エクスポート処理の成功モック
    vi.mocked(exportToSpreadsheet).mockResolvedValue({
      success: true,
      exportedSheets: [{ spreadsheetId: 'sheet-id', year: 2023 }]
    });
  });

  it('should skip processing if offline', async () => {
    // Arrange
    vi.mocked(getNetworkStatus).mockResolvedValue('offline');
    vi.mocked(getQueue).mockResolvedValue([{ id: '1' }] as any);

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
    vi.mocked(getQueue)
      .mockResolvedValueOnce([mockEntry] as any)
      .mockResolvedValue([]); // Processing -> Empty

    // Act
    const result = await processExportQueue();

    // Assert
    expect(result.successCount).toBe(1);
    expect(removeFromQueue).toHaveBeenCalledWith('entry-1');
    expect(exportToSpreadsheet).toHaveBeenCalled();
  });

  it('should handle max retries exceeded', async () => {
    // Arrange
    const mockEntry = {
      id: 'entry-2',
      retryCount: 3
    };
    vi.mocked(getQueue)
      .mockResolvedValueOnce([mockEntry] as any)
      .mockResolvedValue([]);
    vi.mocked(hasExceededMaxRetries).mockReturnValue(true);

    // Act
    const result = await processExportQueue();

    // Assert
    expect(result.skippedCount).toBe(1);
    expect(removeFromQueue).toHaveBeenCalledWith('entry-2');
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
    vi.mocked(getQueue)
      .mockResolvedValueOnce([mockEntry] as any)
      .mockResolvedValue(['entry-3'] as any); // Still in queue
    vi.mocked(exportToSpreadsheet).mockResolvedValue({
      success: false,
      error: 'API Error',
      exportedSheets: []
    });

    // Act
    const result = await processExportQueue();

    // Assert
    expect(result.failCount).toBe(1);
    expect(incrementRetry).toHaveBeenCalledWith('entry-3', expect.any(String));
    expect(removeFromQueue).not.toHaveBeenCalledWith('entry-3');
  });

  it('should stop processing if network goes offline during processing', async () => {
    // Arrange
    const entries = [
      { id: 'e1', exportConfig: { formats: ['googleSheets'] } },
      { id: 'e2', exportConfig: { formats: ['googleSheets'] } }
    ];
    vi.mocked(getQueue).mockResolvedValueOnce(entries as any);

    // e1 fails -> check network -> offline -> break
    vi.mocked(exportToSpreadsheet).mockResolvedValue({ success: false, exportedSheets: [] });

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
});
