// バックグラウンド同期実行ロジック
// スケジューラから呼び出され、データ取得とエクスポート処理の開始を担当する

import { generateDateRange, getDateDaysAgo, getEndOfToday } from '../../utils/formatters';
import {
  loadBackgroundSyncConfig,
  loadLastBackgroundSync,
  saveLastBackgroundSync
} from '../config/backgroundSyncConfig';
import { addDebugLog } from '../debugLogService';
import { handleExportRequest } from '../export/controller';
import { fetchAllHealthData, initializeHealthConnect } from '../healthConnect';
import { processQueue } from '../offline-queue/processor';

// モジュールロード時のログは非同期で実行
addDebugLog('[SyncOperation] Module loaded', 'info').catch(() => {});

/** 最小取得日数 */
const MIN_FETCH_DAYS = 7;
/** 最大取得日数 */
const MAX_FETCH_DAYS = 30;

/**
 * 実行結果の型定義
 */
export interface SyncExecutionResult {
  success: boolean;
  hasNewData: boolean;
  hasQueueProcessed: boolean;
}

/**
 * 動的に取得期間を計算
 * 前回同期からの経過日数と最小値の大きい方を返す（最大値で制限）
 */
export async function calculateFetchDays(): Promise<number> {
  const lastSync = await loadLastBackgroundSync();

  if (!lastSync) {
    return MIN_FETCH_DAYS;
  }

  const daysSinceLastSync = Math.ceil(
    (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.min(Math.max(daysSinceLastSync, MIN_FETCH_DAYS), MAX_FETCH_DAYS);
}

/**
 * 同期処理のメインロジックを実行
 * @returns 実行結果
 */
export async function executeSyncLogic(): Promise<SyncExecutionResult> {
  await addDebugLog('[SyncOperation] Starting execution', 'info');

  const result: SyncExecutionResult = {
    success: true,
    hasNewData: false,
    hasQueueProcessed: false
  };

  try {
    // 設定を確認
    const config = await loadBackgroundSyncConfig();
    if (!config.enabled) {
      await addDebugLog('[SyncOperation] Auto sync is disabled', 'info');
      return { ...result, success: false };
    }

    // === 新規データ取得・エクスポート ===
    try {
      // Health Connect を初期化
      const initialized = await initializeHealthConnect();

      if (initialized) {
        // 取得日数を動的に計算
        const fetchDays = await calculateFetchDays();
        await addDebugLog(`[SyncOperation] Fetching for ${fetchDays} days`, 'info');

        const startTime = getDateDaysAgo(fetchDays);
        const endTime = getEndOfToday();
        const dateRange = generateDateRange(startTime, endTime);

        // Health Connect からデータを取得
        const healthData = await fetchAllHealthData(startTime, endTime);

        // データがあるか確認
        const hasData = Object.values(healthData).some(
          (arr) => Array.isArray(arr) && arr.length > 0
        );

        if (hasData) {
          await addDebugLog('[SyncOperation] Data found, requesting export', 'info');
          // Processorに処理を委譲（オンラインなら実行、オフラインならキュー）
          const exportSuccess = await handleExportRequest(healthData, dateRange);

          if (exportSuccess) {
            result.hasNewData = true;
            await addDebugLog('[SyncOperation] Export requested successfully', 'success');
          } else {
            await addDebugLog(
              '[SyncOperation] Export request returned false (queued or failed)',
              'info'
            );
          }
        } else {
          await addDebugLog('[SyncOperation] No health data available', 'info');
        }
      } else {
        await addDebugLog('[SyncOperation] Health Connect init failed', 'error');
      }
    } catch (fetchError) {
      await addDebugLog(`[SyncOperation] Fetch error: ${fetchError}`, 'error');
      // 取得エラーがあってもキュー処理は続行
    }

    // === オフラインキュー処理 ===
    // 保留中のキューがあれば処理を試みる
    const queueResult = await processQueue();
    if (queueResult.successCount > 0) {
      await addDebugLog(
        `[SyncOperation] Queue processed: ${queueResult.successCount} items`,
        'success'
      );
      result.hasQueueProcessed = true;
    }

    // 同期成功時刻を記録
    // データがエクスポートされたか、キューが処理された場合に更新
    if (result.hasNewData || result.hasQueueProcessed) {
      await saveLastBackgroundSync(new Date().toISOString());
    }

    return result;
  } catch (error) {
    await addDebugLog(`[SyncOperation] Fatal error: ${error}`, 'error');
    return { ...result, success: false };
  }
}
