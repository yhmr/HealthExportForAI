import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as driveConfig from '../../../src/services/config/driveConfig';
import * as exportConfig from '../../../src/services/config/exportConfig';
import * as queueStorage from '../../../src/services/export/queue-storage';
import { processExportQueue } from '../../../src/services/export/service';
import * as sheetsExport from '../../../src/services/export/sheets';
import * as networkService from '../../../src/services/networkService';
import * as adapterFactory from '../../../src/services/storage/adapterFactory';
import { useOfflineStore } from '../../../src/stores/offlineStore';

// Mocks
vi.mock('../../../src/services/networkService');
vi.mock('../../../src/services/export/queue-storage');
vi.mock('../../../src/services/storage/adapterFactory');
vi.mock('../../../src/services/config/exportConfig');
vi.mock('../../../src/services/config/driveConfig');
vi.mock('../../../src/services/export/sheets');
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
    (networkService.getNetworkStatus as any).mockResolvedValue('online');
    (queueStorage.getQueue as any).mockResolvedValue([]);

    // Config系モック
    (exportConfig.loadExportFormats as any).mockResolvedValue(['googleSheets']);
    (exportConfig.loadExportSheetAsPdf as any).mockResolvedValue(false);
    (driveConfig.loadDriveConfig as any).mockResolvedValue({
      folderId: 'folder-id',
      folderName: 'folder-name'
    });

    // アダプタのモック
    (adapterFactory.createStorageAdapter as any).mockReturnValue({
      initialize: vi.fn().mockResolvedValue(true),
      findOrCreateFolder: vi.fn().mockResolvedValue('folder-id'),
      defaultFolderName: 'ConnectHealth'
    });
    (adapterFactory.createSpreadsheetAdapter as any).mockReturnValue({});

    // エクスポート処理の成功モック
    (sheetsExport.exportToSpreadsheet as any).mockResolvedValue({
      success: true,
      exportedSheets: [{ spreadsheetId: 'sheet-id', year: 2023 }]
    });
  });

  it('should skip processing if offline', async () => {
    // Arrange
    (networkService.getNetworkStatus as any).mockResolvedValue('offline');
    (queueStorage.getQueue as any).mockResolvedValue([{ id: '1' }]);

    // Act
    const result = await processExportQueue();

    // Assert
    expect(result.successCount).toBe(0);
    expect(result.skippedCount).toBe(0);
    // processSingleEntry is not called
    expect(sheetsExport.exportToSpreadsheet).not.toHaveBeenCalled();
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
    (queueStorage.getQueue as any).mockResolvedValueOnce([mockEntry]).mockResolvedValue([]); // Processing -> Empty

    // Act
    const result = await processExportQueue();

    // Assert
    expect(result.successCount).toBe(1);
    expect(queueStorage.removeFromQueue).toHaveBeenCalledWith('entry-1');
    expect(sheetsExport.exportToSpreadsheet).toHaveBeenCalled();
  });

  it('should handle max retries exceeded', async () => {
    // Arrange
    const mockEntry = {
      id: 'entry-2',
      retryCount: 3
    };
    (queueStorage.getQueue as any).mockResolvedValueOnce([mockEntry]).mockResolvedValue([]);
    (queueStorage.hasExceededMaxRetries as any).mockReturnValue(true);

    // Act
    const result = await processExportQueue();

    // Assert
    expect(result.skippedCount).toBe(1);
    expect(queueStorage.removeFromQueue).toHaveBeenCalledWith('entry-2');
    expect(sheetsExport.exportToSpreadsheet).not.toHaveBeenCalled();
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
    (queueStorage.getQueue as any)
      .mockResolvedValueOnce([mockEntry])
      .mockResolvedValue(['entry-3']); // Still in queue
    (sheetsExport.exportToSpreadsheet as any).mockResolvedValue({
      success: false,
      error: 'API Error'
    });

    // Act
    const result = await processExportQueue();

    // Assert
    expect(result.failCount).toBe(1);
    expect(queueStorage.incrementRetry).toHaveBeenCalledWith('entry-3', expect.any(String));
    expect(queueStorage.removeFromQueue).not.toHaveBeenCalledWith('entry-3');
  });

  it('should stop processing if network goes offline during processing', async () => {
    // Arrange
    const entries = [
      { id: 'e1', exportConfig: { formats: ['googleSheets'] } },
      { id: 'e2', exportConfig: { formats: ['googleSheets'] } }
    ];
    (queueStorage.getQueue as any).mockResolvedValueOnce(entries);

    // e1 fails -> check network -> offline -> break
    (sheetsExport.exportToSpreadsheet as any).mockResolvedValue({ success: false });

    // First check (start): online
    // Second check (after failure): offline
    (networkService.getNetworkStatus as any)
      .mockResolvedValueOnce('online')
      .mockResolvedValueOnce('offline');

    // Act
    const result = await processExportQueue();

    // Assert
    expect(result.failCount).toBe(1);
    expect(result.successCount).toBe(0);
    // e2 should not be processed
    expect(sheetsExport.exportToSpreadsheet).toHaveBeenCalledTimes(1);
  });
});
