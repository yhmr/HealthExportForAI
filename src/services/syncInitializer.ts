/**
 * 同期初期化ヘルパー
 * ウィジェット/バックグラウンドタスク用の共通初期化処理を提供
 */

import { IOS_CLIENT_ID, WEB_CLIENT_ID } from '../config/driveConfig';
import { addDebugLog } from './debugLogService';
import { healthService } from './health/healthAdapterFactory';
import { googleAuthService } from './infrastructure/GoogleAuthService';

/**
 * 初期化エラーの種別
 */
export type InitErrorType = 'auth_failed' | 'health_connect_failed' | 'permission_denied';

/**
 * 初期化結果の型
 */
export interface InitializationResult {
  success: boolean;
  error?: InitErrorType;
}

/**
 * ウィジェット/バックグラウンドタスク用の初期化処理
 *
 * 以下の順序で初期化を実行:
 * 1. Google認証設定 + 既存ログイン確認 + サイレントトークン取得
 * 2. Health Connect SDK初期化
 * 3. Health Connect権限チェック
 *
 * @returns 初期化結果（success: trueなら全ての初期化が完了）
 */
export async function initializeForSync(): Promise<InitializationResult> {
  // 1. Google認証設定
  try {
    googleAuthService.configure(WEB_CLIENT_ID, IOS_CLIENT_ID);
  } catch (e) {
    await addDebugLog(`[SyncInitializer] Auth config error: ${e}`, 'warn');
  }

  // 2. 認証状態チェック + サイレントトークン取得
  try {
    const signedIn = await googleAuthService.isSignedIn();
    if (!signedIn) {
      await addDebugLog(
        '[SyncInitializer] Not signed in (interactive sign-in is not allowed)',
        'warn'
      );
      return { success: false, error: 'auth_failed' };
    }

    const tokenResult = await googleAuthService.getOrRefreshAccessToken();
    if (!tokenResult.isOk()) {
      await addDebugLog(
        `[SyncInitializer] Silent token fetch failed: ${tokenResult.unwrapErr().message}`,
        'error'
      );
      await addDebugLog('[SyncInitializer] Authentication failed', 'error');
      return { success: false, error: 'auth_failed' };
    }
  } catch (e) {
    await addDebugLog(`[SyncInitializer] Auth check error: ${e}`, 'error');
    return { success: false, error: 'auth_failed' };
  }

  // 3. Health Connect初期化
  const initResult = await healthService.initialize();
  if (!initResult.unwrapOr(false)) {
    await addDebugLog('[SyncInitializer] Health SDK init failed', 'error');
    return { success: false, error: 'health_connect_failed' };
  }

  // 4. 権限チェック
  const permResult = await healthService.hasPermissions();
  if (!permResult.unwrapOr(false)) {
    await addDebugLog('[SyncInitializer] Health Connect permission missing', 'warn');
    return { success: false, error: 'permission_denied' };
  }

  await addDebugLog('[SyncInitializer] Initialization completed successfully', 'success');
  return { success: true };
}
