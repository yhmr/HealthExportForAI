// Google認証サービス

import { GoogleSignin, statusCodes, type User } from '@react-native-google-signin/google-signin';

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
    console.error('サインアウトエラー:', error);
  }
}

/**
 * アクセストークンを取得
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch (error) {
    console.error('トークン取得エラー:', error);
    return null;
  }
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
    console.error('トークン更新エラー:', error);
    return null;
  }
}
