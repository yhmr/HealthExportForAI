// インフラストラクチャ層共通型定義

import { User } from '@react-native-google-signin/google-signin';

import { AuthError } from '../../types/errors';
import { Result } from '../../types/result';

/**
 * 認証サービスのインターフェース
 */
export interface IAuthService {
  configure(webClientId: string, iosClientId?: string): void;
  isSignedIn(): Promise<boolean>;
  getCurrentUser(): Promise<User | null>;
  signIn(): Promise<Result<User, AuthError>>;
  signOut(): Promise<Result<void, AuthError>>;
  getOrRefreshAccessToken(): Promise<Result<string, AuthError>>;
}

/**
 * Key-Value形式のストレージインターフェース
 * (AsyncStorageの抽象化)
 */
export interface IKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
