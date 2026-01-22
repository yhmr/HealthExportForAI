// オフライン同期カスタムフック
// ネットワーク状態監視・キュー管理・自動同期を統合

import { useCallback, useEffect, useRef, useState } from 'react';
import { addDebugLog } from '../services/debugLogService';
import { addToQueue, getQueue } from '../services/export/queue-storage';
import { processExportQueue } from '../services/export/service';
import { getNetworkStatus, subscribeToNetworkChanges } from '../services/networkService';
import type { DataTagKey } from '../stores/healthStore';
import { useOfflineStore } from '../stores/offlineStore';
import type { HealthData } from '../types/health';

/**
 * オフライン同期フック
 * アプリの起動時やオンライン復帰時にキューを処理する
 */
export const useOfflineSync = () => {
  const setPendingCount = useOfflineStore((state) => state.setPendingCount);
  const isProcessing = useOfflineStore((state) => state.isProcessing);
  const setProcessing = useOfflineStore((state) => state.setProcessing);
  const lastError = useOfflineStore((state) => state.lastError);
  const setError = useOfflineStore((state) => state.setError);
  const pendingCount = useOfflineStore((state) => state.pendingCount);

  const [isOnline, setOnline] = useState(true);
  const isInitialized = useRef(false);

  /**
   * 現在のキュー件数を更新
   */
  const updatePendingCount = useCallback(async () => {
    try {
      const queue = await getQueue();
      setPendingCount(queue.length);
      return queue.length;
    } catch {
      return 0;
    }
  }, [setPendingCount]);

  /**
   * キューを即時処理
   * （オンライン時のみ）
   */
  const processQueueNow = useCallback(async () => {
    const currentStatus = await getNetworkStatus();
    if (currentStatus !== 'online') {
      await addDebugLog('[OfflineSync] Offline, skipping process', 'info');
      return;
    }

    if (isProcessing) {
      await addDebugLog('[OfflineSync] Already processing', 'info');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      await processExportQueue(); // デフォルトタイムアウト(5分)で実行
      await updatePendingCount();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      await addDebugLog(`[OfflineSync] Process error: ${msg}`, 'error');
    } finally {
      setProcessing(false);
    }
  }, [isProcessing, setProcessing, setError, updatePendingCount]);

  /**
   * 初期化とネットワーク監視
   */
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initialize = async () => {
      const status = await getNetworkStatus();
      setOnline(status === 'online');

      const count = await updatePendingCount();

      // オンラインで未同期データがあれば自動同期
      if (status === 'online' && count > 0) {
        processQueueNow();
      }
    };

    initialize();

    // ネットワーク状態変化を監視
    const unsubscribe = subscribeToNetworkChanges(async (status) => {
      const online = status === 'online';
      setOnline(online);

      // オンライン復帰時に自動同期
      if (online) {
        const queue = await getQueue();
        if (queue.length > 0) {
          processQueueNow();
        }
      }
    });

    return unsubscribe;
  }, [setOnline, updatePendingCount, processQueueNow]);

  /**
   * オフラインキューにデータを追加
   */
  const addToOfflineQueue = useCallback(
    async (
      healthData: HealthData,
      selectedTags: Set<DataTagKey>,
      syncDateRange: Set<string> | null
    ): Promise<string | null> => {
      const id = await addToQueue({
        healthData,
        selectedTags: Array.from(selectedTags),
        syncDateRange: syncDateRange ? Array.from(syncDateRange) : null
      });
      await updatePendingCount();
      return id;
    },
    [updatePendingCount]
  );

  return {
    isOnline,
    pendingCount,
    isProcessing,
    lastError,
    addToOfflineQueue,
    processQueueNow
  };
};
