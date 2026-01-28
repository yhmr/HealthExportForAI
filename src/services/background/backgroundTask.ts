import { AutoSyncConfig } from '../../types/exportTypes';
import { addDebugLog } from '../debugLogService';
import { BACKGROUND_EXECUTION_TIMEOUT_MS, processExportQueue } from '../export/service';
import { SyncService } from '../syncService';

// モジュールロード時のログは非同期で実行
addDebugLog('[SyncOperation] Module loaded', 'info').catch(() => {});

/**
 * 実行結果の型定義
 */
export interface SyncExecutionResult {
  success: boolean;
  hasNewData: boolean;
  hasQueueProcessed: boolean;
}

/**
 * 同期処理のメインロジックを実行
 * @returns 実行結果
 */
export async function executeSyncLogic(config: AutoSyncConfig): Promise<SyncExecutionResult> {
  await addDebugLog('[SyncOperation] Starting execution', 'info');

  const result: SyncExecutionResult = {
    success: true,
    hasNewData: false,
    hasQueueProcessed: false
  };

  try {
    // 意図しないタイミングで同期が行われた場合に備えて、設定を確認する
    if (!config.enabled) {
      await addDebugLog('[SyncOperation] Auto sync is disabled', 'info');
      return { ...result, success: false };
    }

    // === 新規データ取得・エクスポート ===
    try {
      const syncResult = await SyncService.performSync();

      if (syncResult.isNewData) {
        if (syncResult.queued) {
          await addDebugLog('[SyncOperation] New data found and queued by SyncService', 'info');
        } else {
          // SyncService側でログが出ているはずだが、念のためここでも
          await addDebugLog(
            '[SyncOperation] New data found but queueing failed in SyncService',
            'warn'
          );
        }
      } else {
        await addDebugLog('[SyncOperation] No new health data to export', 'info');
      }
    } catch (fetchError) {
      await addDebugLog(`[SyncOperation] Fetch error: ${fetchError}`, 'error');
      // 取得エラーがあっても（既存の）キュー処理は続行
    }

    // === キュー処理（新規追加分も含む） ===
    // オンラインであれば処理を試みる
    // ★バックグラウンド用タイムアウト(25s)を指定
    const queueResult = await processExportQueue(BACKGROUND_EXECUTION_TIMEOUT_MS);

    if (queueResult.successCount > 0) {
      await addDebugLog(
        `[SyncOperation] Queue processed: ${queueResult.successCount} items`,
        'success'
      );
      result.hasQueueProcessed = true;
      result.hasNewData = true; // キュー処理できた＝何らかのデータが進んだ
    }

    return result;
  } catch (error) {
    await addDebugLog(`[SyncOperation] Fatal error: ${error}`, 'error');
    return { ...result, success: false };
  }
}
