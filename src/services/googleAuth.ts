// Google認証サービス

import { GoogleSignin, statusCodes, type User } from '@react-native-google-signin/google-signin';
import { addDebugLog } from './debugLogService';

// Google Drive APIとGoogle Sheets APIのスコープ
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets'
];

/**
 * Google Sign-Inを設定
 */
export function configureGoogleSignIn(webClientId: string): void {
  GoogleSignin.configure({
    scopes: SCOPES,
    webClientId,
    offlineAccess: true
  });
}

/**
 * サインイン状態をチェック
 */
export async function isSignedIn(): Promise<boolean> {
  return GoogleSignin.hasPreviousSignIn();
}

/**
 * 現在のユーザー情報を取得
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const userInfo = await GoogleSignin.signInSilently();
    return userInfo.data;
  } catch {
    return null;
  }
}

/**
 * Googleアカウントでサインイン
 */
export async function signIn(): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    return { success: true, user: userInfo.data ?? undefined };
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, error: 'サインインがキャンセルされました' };
    } else if (error.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'サインイン処理中です' };
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, error: 'Google Play Servicesが利用できません' };
    } else {
      return { success: false, error: error.message || '不明なエラー' };
    }
  }
}

/**
 * サインアウト
 */
export async function signOut(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    await addDebugLog(`サインアウトエラー: ${error}`, 'error');
  }
}

/**
 * トークン取得のPromiseを保持（重複実行防止用）
 */
let tokenRefreshPromise: Promise<string | null> | null = null;

/**
 * アクセストークンを取得（重複実行防止とリトライロジック付き）
 */
export async function getAccessToken(): Promise<string | null> {
  // すでに実行中のトークン取得処理があれば、その結果を待つ
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  tokenRefreshPromise = (async () => {
    try {
      // 既存のトークン取得を試みる
      const tokens = await GoogleSignin.getTokens();
      return tokens.accessToken;
    } catch (error: any) {
      await addDebugLog(`トークン取得エラー(1回目): ${error}`, 'error');

      // "previous promise did not settle" エラーなどの場合、少し待って再試行
      if (error.message && error.message.includes('previous promise')) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
          const retryTokens = await GoogleSignin.getTokens();
          return retryTokens.accessToken;
        } catch (retryError) {
          await addDebugLog(`トークン取得エラー(リトライ): ${retryError}`, 'error');
        }
      }

      // トークンが無効な場合、サイレントサインインを試みてトークンをリフレッシュ
      try {
        const userInfo = await GoogleSignin.signInSilently();
        if (userInfo.data) {
          // サイレントサインイン成功後、再度トークン取得
          const refreshedTokens = await GoogleSignin.getTokens();

          return refreshedTokens.accessToken;
        }
      } catch (silentError) {
        await addDebugLog(`サイレントサインインエラー: ${silentError}`, 'error');
      }

      return null;
    } finally {
      // 処理完了後にPromiseをクリア
      tokenRefreshPromise = null;
    }
  })();

  return tokenRefreshPromise;
}

/**
 * トークンを更新
 */
export async function refreshTokens(): Promise<string | null> {
  try {
    await GoogleSignin.clearCachedAccessToken((await GoogleSignin.getTokens()).accessToken);
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch (error) {
    await addDebugLog(`トークン更新エラー: ${error}`, 'error');
    return null;
  }
}
