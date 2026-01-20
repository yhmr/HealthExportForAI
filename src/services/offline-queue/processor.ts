// オフラインキュー処理サービス
// キュー内の保留中エクスポートを順次処理する（リトライ専用）

import type { DataTagKey } from '../../stores/healthStore';
import { filterHealthDataByTags } from '../../stores/healthStore';
import { useOfflineStore } from '../../stores/offlineStore';
import type { PendingExport } from '../../types/offline';
import { addDebugLog } from '../debugLogService';
import { executeExport } from '../export/controller';
import { getNetworkStatus } from '../networkService';
import { createSpreadsheetAdapter, createStorageAdapter } from '../storage/adapterFactory';
import {
  getQueue,
  hasExceededMaxRetries,
  incrementRetry,
  MAX_RETRY_COUNT,
  removeFromQueue
} from './queue-storage';

/**
 * キュー処理の結果
 */
export interface ProcessQueueResult {
  /** 成功したエントリ数 */
  successCount: number;
  /** 失敗したエントリ数 */
  failCount: number;
  /** スキップされたエントリ数（最大リトライ超過） */
  skippedCount: number;
  /** 処理中に発生したエラー */
  errors: string[];
}

/**
 * 単一のキューエントリを処理（リトライ用）
 * @param entry 処理するエントリ
 * @returns 成功した場合true
 */
async function processSingleEntry(entry: PendingExport): Promise<boolean> {
  await addDebugLog(`[QueueProcessor] Processing queue entry ${entry.id}...`, 'info');

  try {
    const networkStatus = await getNetworkStatus();
    if (networkStatus !== 'online') {
      return false;
    }

    const storageAdapter = createStorageAdapter();
    const spreadsheetAdapter = createSpreadsheetAdapter();

    const selectedTags = new Set(entry.selectedTags as DataTagKey[]);
    const dataToExport = filterHealthDataByTags(entry.healthData, selectedTags);

    const syncDateRange = entry.syncDateRange ? new Set(entry.syncDateRange) : undefined;

    const result = await executeExport(
      dataToExport,
      storageAdapter,
      spreadsheetAdapter,
      syncDateRange
    );

    if (result.success) {
      await addDebugLog(`[QueueProcessor] Entry ${entry.id} processed successfully`, 'success');
      return true;
    } else {
      const errorMsg = result.error || 'Unknown error';
      await addDebugLog(`[QueueProcessor] Entry ${entry.id} failed: ${errorMsg}`, 'error');
      await incrementRetry(entry.id, errorMsg);
      return false;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await addDebugLog(`[QueueProcessor] Entry ${entry.id} threw error: ${errorMsg}`, 'error');
    await incrementRetry(entry.id, errorMsg);
    return false;
  }
}

/**
 * キュー内の全エクスポートを順次処理
 * オンライン復帰時やバックグラウンド処理から呼ばれる
 * @returns 処理結果
 */
export async function processQueue(): Promise<ProcessQueueResult> {
  const result: ProcessQueueResult = {
    successCount: 0,
    failCount: 0,
    skippedCount: 0,
    errors: []
  };

  await addDebugLog('[QueueProcessor] Starting queue processing...', 'info');

  const networkStatus = await getNetworkStatus();
  if (networkStatus !== 'online') {
    await addDebugLog('[QueueProcessor] Network is offline, aborting queue processing', 'info');
    return result;
  }

  const queue = await getQueue();
  await addDebugLog(`[QueueProcessor] Found ${queue.length} entries in queue`, 'info');

  for (const entry of queue) {
    if (hasExceededMaxRetries(entry)) {
      await addDebugLog(
        `[QueueProcessor] Entry ${entry.id} exceeded max retries (${MAX_RETRY_COUNT}), skipping`,
        'info'
      );
      result.skippedCount++;
      await removeFromQueue(entry.id);
      result.errors.push(`Entry ${entry.id}: Max retries exceeded. Last error: ${entry.lastError}`);
      continue;
    }

    const success = await processSingleEntry(entry);

    if (success) {
      result.successCount++;
      await removeFromQueue(entry.id);
    } else {
      result.failCount++;
      const currentStatus = await getNetworkStatus();
      if (currentStatus !== 'online') {
        await addDebugLog(
          '[QueueProcessor] Network went offline, stopping queue processing',
          'info'
        );
        break;
      }
    }
  }

  // ストアのカウント更新
  const remainingQueue = await getQueue();
  useOfflineStore.getState().setPendingCount(remainingQueue.length);

  await addDebugLog(
    `[QueueProcessor] Queue processing complete. Success: ${result.successCount}, Failed: ${result.failCount}, Skipped: ${result.skippedCount}`,
    'info'
  );

  return result;
}
