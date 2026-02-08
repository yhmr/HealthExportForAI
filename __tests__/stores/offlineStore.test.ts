// offlineStore のテスト
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queueManager } from '../../src/services/export/QueueManager';
import { useOfflineStore } from '../../src/stores/offlineStore';

// getQueue のモック
vi.mock('../../src/services/export/QueueManager', () => ({
  queueManager: {
    getQueue: vi.fn()
  }
}));

describe('offlineStore', () => {
  beforeEach(() => {
    // ストアをリセット
    useOfflineStore.setState({
      pendingCount: 0,
      isProcessing: false,
      lastSyncAttempt: null,
      lastSyncSuccess: null,
      lastError: null
    });
    vi.clearAllMocks();
  });

  it('初期状態が正しい', () => {
    const state = useOfflineStore.getState();
    expect(state.pendingCount).toBe(0);
    expect(state.isProcessing).toBe(false);
    expect(state.lastSyncAttempt).toBeNull();
    expect(state.lastSyncSuccess).toBeNull();
    expect(state.lastError).toBeNull();
  });

  it('setPendingCountで未同期件数を設定できる', () => {
    useOfflineStore.getState().setPendingCount(5);
    expect(useOfflineStore.getState().pendingCount).toBe(5);
  });

  it('setProcessingで処理中フラグを設定できる', () => {
    useOfflineStore.getState().setProcessing(true);
    expect(useOfflineStore.getState().isProcessing).toBe(true);

    useOfflineStore.getState().setProcessing(false);
    expect(useOfflineStore.getState().isProcessing).toBe(false);
  });

  it('recordSyncAttemptで同期試行時刻を記録できる', () => {
    vi.useFakeTimers();
    const mockDate = new Date('2026-01-01T12:00:00Z');
    vi.setSystemTime(mockDate);

    useOfflineStore.getState().recordSyncAttempt();
    expect(useOfflineStore.getState().lastSyncAttempt).toBe(mockDate.toISOString());

    vi.useRealTimers();
  });

  it('recordSyncSuccessで成功時刻を記録し、エラーをクリアする', () => {
    vi.useFakeTimers();
    const mockDate = new Date('2026-01-01T12:00:00Z');
    vi.setSystemTime(mockDate);

    // 事前にエラーを設定しておく
    useOfflineStore.getState().setError('Previous Error');
    expect(useOfflineStore.getState().lastError).toBe('Previous Error');

    useOfflineStore.getState().recordSyncSuccess();

    expect(useOfflineStore.getState().lastSyncSuccess).toBe(mockDate.toISOString());
    expect(useOfflineStore.getState().lastError).toBeNull();

    vi.useRealTimers();
  });

  it('setErrorでエラーを設定できる', () => {
    useOfflineStore.getState().setError('New Error');
    expect(useOfflineStore.getState().lastError).toBe('New Error');
  });

  describe('refreshPendingCount', () => {
    it('キューから件数を再読み込みして設定する', async () => {
      // モックの実装
      vi.mocked(queueManager.getQueue).mockResolvedValue([
        {
          id: '1',
          healthData: {} as any,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          selectedTags: [],
          syncDateRange: null
        },
        {
          id: '2',
          healthData: {} as any,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          selectedTags: [],
          syncDateRange: null
        }
      ]);

      await useOfflineStore.getState().refreshPendingCount();

      expect(queueManager.getQueue).toHaveBeenCalled();
      expect(useOfflineStore.getState().pendingCount).toBe(2);
    });

    it('エラー時はコンソールエラーを出力し、件数は変更しない', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(queueManager.getQueue).mockRejectedValue(new Error('Queue Error'));

      useOfflineStore.getState().setPendingCount(10); // 初期値を設定

      await useOfflineStore.getState().refreshPendingCount();

      expect(queueManager.getQueue).toHaveBeenCalledTimes(1);
      expect(useOfflineStore.getState().pendingCount).toBe(10); // 変更なし
      expect(consoleSpy).toHaveBeenCalledWith(
        '[OfflineStore] Failed to refresh pending count:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
