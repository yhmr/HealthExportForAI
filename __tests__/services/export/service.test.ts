import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as debugLogService from '../../../src/services/debugLogService';
import * as queueStorage from '../../../src/services/export/queue-storage';
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

      const mockAddToQueue = queueStorage.addToQueue as any;
      mockAddToQueue.mockResolvedValue('new-id');

      const mockGetQueue = queueStorage.getQueue as any;
      mockGetQueue.mockResolvedValue(['item1']); // 1件ある状態を模擬

      // Act
      const result = await addToExportQueue(mockHealthData, mockDateRange);

      // Assert
      expect(result).toBe(true);
      expect(mockAddToQueue).toHaveBeenCalledWith(
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

      const mockAddToQueue = queueStorage.addToQueue as any;
      mockAddToQueue.mockRejectedValue(new Error('Queue Error'));

      // Act
      const result = await addToExportQueue(mockHealthData, mockDateRange);

      // Assert
      expect(result).toBe(false);
      expect(debugLogService.addDebugLog).toHaveBeenCalledWith(
        expect.stringContaining('Queue add failed'),
        'error'
      );
    });
  });
});
