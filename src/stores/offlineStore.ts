// オフラインキュー状態のZustandストア

import { create } from 'zustand';
import { queueManager } from '../services/export/QueueManager';

/**
 * オフラインストアのインターフェース
 */
interface OfflineStore {
  /** 未同期データ件数 */
  pendingCount: number;
  /** 同期処理中フラグ */
  isProcessing: boolean;
  /** 最後の同期試行時刻 */
  lastSyncAttempt: string | null;
  /** 最後の同期成功時刻 */
  lastSyncSuccess: string | null;
  /** 最後のエラーメッセージ */
  lastError: string | null;

  // アクション
  /** 未同期件数を設定 */
  setPendingCount: (count: number) => void;
  /** 処理中フラグを設定 */
  setProcessing: (processing: boolean) => void;
  /** 同期試行を記録 */
  recordSyncAttempt: () => void;
  /** 同期成功を記録 */
  recordSyncSuccess: () => void;
  /** エラーを設定 */
  setError: (error: string | null) => void;
  /** キューから件数を再読み込み */
  refreshPendingCount: () => Promise<void>;
}

/**
 * オフラインキュー状態のグローバルストア
 */
export const useOfflineStore = create<OfflineStore>((set) => ({
  pendingCount: 0,
  isProcessing: false,
  lastSyncAttempt: null,
  lastSyncSuccess: null,
  lastError: null,

  setPendingCount: (pendingCount) => set({ pendingCount }),

  setProcessing: (isProcessing) => set({ isProcessing }),

  recordSyncAttempt: () => set({ lastSyncAttempt: new Date().toISOString() }),

  recordSyncSuccess: () =>
    set({
      lastSyncSuccess: new Date().toISOString(),
      lastError: null
    }),

  setError: (lastError) => set({ lastError }),

  refreshPendingCount: async () => {
    try {
      const queue = await queueManager.getQueue();
      set({ pendingCount: queue.length });
    } catch (error) {
      console.error('[OfflineStore] Failed to refresh pending count:', error);
    }
  }
}));
