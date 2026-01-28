import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addDebugLog } from '../../../src/services/debugLogService';
import { addToQueue, getQueue } from '../../../src/services/export/queue-storage';
import { addToExportQueue } from '../../../src/services/export/service';
import { useOfflineStore } from '../../../src/stores/offlineStore';

// モックの設定
vi.mock('../../../src/services/export/queue-storage', () => ({
  addToQueue: vi.fn(),
  getQueue: vi.fn(),
  removeFromQueue: vi.fn(),
  incrementRetry: vi.fn(),
  hasExceededMaxRetries: vi.fn(),
  MAX_RETRY_COUNT: 3
}));

vi.mock('../../../src/services/debugLogService', () => ({
  addDebugLog: vi.fn()
}));

// 追加のモック定義（SyntaxError回避のため全依存をMock化）
vi.mock('../../../src/services/config/driveConfig', () => ({
  loadDriveConfig: vi.fn()
}));
vi.mock('../../../src/services/config/exportConfig', () => ({
  loadExportFormats: vi.fn(),
  loadExportSheetAsPdf: vi.fn(),
  createDefaultExportConfig: vi.fn()
}));
vi.mock('../../../src/services/networkService', () => ({
  getNetworkStatus: vi.fn().mockResolvedValue('online'),
  subscribeToNetworkChanges: vi.fn(),
  isInternetReachable: vi.fn()
}));
vi.mock('../../../src/services/storage/adapterFactory', () => ({
  createStorageAdapter: vi.fn(),
  createSpreadsheetAdapter: vi.fn()
}));
vi.mock('../../../src/services/export/csv', () => ({
  exportToCSV: vi.fn()
}));
vi.mock('../../../src/services/export/json', () => ({
  exportToJSON: vi.fn()
}));
vi.mock('../../../src/services/export/pdf', () => ({
  exportSpreadsheetAsPDF: vi.fn()
}));
vi.mock('../../../src/services/export/sheets', () => ({
  exportToSpreadsheet: vi.fn()
}));

describe('ExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOfflineStore.setState({ pendingCount: 0 });
  });

  describe('addToExportQueue', () => {
    it('should add item to queue and update store count', async () => {
      // Arrange
      const mockHealthData: any = { steps: [1, 2, 3] }; // 簡易的なデータ
      const mockDateRange = new Set(['2023-01-01']);

      vi.mocked(addToQueue).mockResolvedValue('new-id');
      vi.mocked(getQueue).mockResolvedValue(['item1'] as any); // 1件ある状態を模擬

      // Act
      const result = await addToExportQueue(mockHealthData, mockDateRange);

      // Assert
      expect(result).toBe(true);
      expect(addToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          healthData: mockHealthData,
          syncDateRange: ['2023-01-01'],
          selectedTags: ['steps']
        })
      );
      expect(useOfflineStore.getState().pendingCount).toBe(1);
    });

    it('should return false if queue addition fails', async () => {
      // Arrange
      const mockHealthData: any = {};
      const mockDateRange = new Set<string>();

      vi.mocked(addToQueue).mockRejectedValue(new Error('Queue Error'));

      // Act
      const result = await addToExportQueue(mockHealthData, mockDateRange);

      // Assert
      expect(result).toBe(false);
      expect(addDebugLog).toHaveBeenCalledWith(
        expect.stringContaining('Queue add failed'),
        'error'
      );
    });
  });
});
