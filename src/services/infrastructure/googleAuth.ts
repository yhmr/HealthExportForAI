// Google認証サービス (Adapter/Facade)

import { User } from '@react-native-google-signin/google-signin';
import { GoogleAuthService } from './GoogleAuthService';

// シングルトンインスタンスの作成
const googleAuthService = new GoogleAuthService();

/**
 * Google Sign-Inを設定
 */
export function configureGoogleSignIn(webClientId: string): void {
  return googleAuthService.configure(webClientId);
}

/**
 * サインイン状態をチェック
 */
export async function isSignedIn(): Promise<boolean> {
  return googleAuthService.isSignedIn();
}

/**
 * 現在のユーザー情報を取得
 */
export async function getCurrentUser(): Promise<User | null> {
  return googleAuthService.getCurrentUser();
}

/**
 * Googleアカウントでサインイン
 */
export async function signIn(): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
  return googleAuthService.signIn();
}

/**
 * サインアウト
 */
export async function signOut(): Promise<void> {
  return googleAuthService.signOut();
}

/**
 * アクセストークンを取得
 */
export async function getOrRefreshAccessToken(): Promise<string | null> {
  return googleAuthService.getOrRefreshAccessToken();
}

// DI注入用（SyncService等）にサービスインスタンスをエクスポート
export { googleAuthService };
