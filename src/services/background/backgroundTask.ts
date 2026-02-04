import { WEB_CLIENT_ID } from '../../config/driveConfig';
import { AutoSyncConfig } from '../../types/exportTypes';
import { addDebugLog } from '../debugLogService';
import { initializeHealthConnect } from '../healthConnect';
import { googleAuthService } from '../infrastructure/GoogleAuthService';
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

  // Google認証設定 (必須)
  try {
    googleAuthService.configure(WEB_CLIENT_ID);
  } catch (e) {
    await addDebugLog(`[SyncOperation] Auth config check: ${e}`, 'warn');
  }

  // Health Connect初期化
  const initResult = await initializeHealthConnect();
  if (!initResult.unwrapOr(false)) {
    await addDebugLog('[SyncOperation] Health Connect init failed', 'error');
    return {
      success: false,
      hasNewData: false,
      hasQueueProcessed: false
    };
  }

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

    // === 同期実行（取得〜エクスポートまで一括） ===
    try {
      const fullSyncResult = await SyncService.executeFullSync();

      if (!fullSyncResult.isOk()) {
        throw new Error(fullSyncResult.unwrapErr().message);
      }
      const { syncResult, exportResult } = fullSyncResult.unwrap();

      if (!syncResult.success) {
        // 同期自体に失敗
        await addDebugLog('[SyncOperation] Sync failed during execution', 'error');
        return { ...result, success: false };
      }

      if (syncResult.isNewData) {
        result.hasNewData = true;
      }

      // キュー処理結果の確認
      if (exportResult && exportResult.successCount > 0) {
        result.hasQueueProcessed = true;
        // ここでは「何らかの進捗があった」ことをOSに伝えるため true を維持
        result.hasNewData = true;
      }
    } catch (err) {
      await addDebugLog(`[SyncOperation] Error during syncAndUpload: ${err}`, 'error');
      // 全体的な失敗として扱うかは要件によるが、エラーログは出したので例外は握りつぶし、success: falseを返す
      return { ...result, success: false };
    }

    return result;
  } catch (error) {
    await addDebugLog(`[SyncOperation] Fatal error: ${error}`, 'error');
    return { ...result, success: false };
  }
}
