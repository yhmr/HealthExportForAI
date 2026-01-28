// Google認証サービス (Adapter/Facade)

import { User } from '@react-native-google-signin/google-signin';
import { GoogleAuthService } from './GoogleAuthService';

import { AuthError } from '../../types/errors';
import { Result } from '../../types/result';

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
export async function signIn(): Promise<Result<User, AuthError>> {
  return googleAuthService.signIn();
}

/**
 * サインアウト
 */
export async function signOut(): Promise<Result<void, AuthError>> {
  return googleAuthService.signOut();
}

/**
 * アクセストークンを取得
 */
export async function getOrRefreshAccessToken(): Promise<Result<string, AuthError>> {
  return googleAuthService.getOrRefreshAccessToken();
}

// DI注入用（SyncService等）にサービスインスタンスをエクスポート
export { googleAuthService };
