// 認証状態を管理するContext

import type { User } from '@react-native-google-signin/google-signin';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react';
import { WEB_CLIENT_ID } from '../config/driveConfig';
import {
  configureGoogleSignIn,
  getCurrentUser,
  isSignedIn,
  signIn,
  signOut
} from '../services/infrastructure/googleAuth';

interface AuthContextType {
  /** 認証済みかどうか */
  isAuthenticated: boolean;
  /** 現在のユーザー情報 */
  currentUser: User | null;
  /** 認証エラー */
  authError: string | null;
  /** 認証状態の初期化が完了したか */
  isInitialized: boolean;
  /** サインイン処理 */
  signIn: () => Promise<boolean>;
  /** サインアウト処理 */
  signOut: () => Promise<void>;
  /** 認証状態を再チェック */
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * 認証状態を管理するプロバイダー
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * 認証状態をチェック
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      // Google Sign-Inを設定
      configureGoogleSignIn(WEB_CLIENT_ID);

      // 認証状態をチェック
      const signedIn = await isSignedIn();
      setIsAuthenticated(signedIn);

      if (signedIn) {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('[AuthContext] checkAuthStatus error:', error);
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  /**
   * サインイン処理
   */
  const handleSignIn = useCallback(async () => {
    setAuthError(null);

    try {
      configureGoogleSignIn(WEB_CLIENT_ID);
      const result = await signIn();

      if (result.isOk()) {
        const user = result.unwrap();
        setIsAuthenticated(true);
        setCurrentUser(user);
        return true;
      } else {
        const error = result.unwrapErr();
        setAuthError(error.message);
        return false;
      }
    } catch (error) {
      console.error('[AuthContext] signIn error:', error);
      setAuthError('サインインに失敗しました');
      return false;
    }
  }, []);

  /**
   * サインアウト処理
   */
  const handleSignOut = useCallback(async () => {
    try {
      const result = await signOut();
      if (result.isErr()) {
        console.error('[AuthContext] signOut warning:', result.unwrapErr().toString());
        // 失敗してもクライアント側はサインアウト扱いにする
      }
      setIsAuthenticated(false);
      setCurrentUser(null);
    } catch (error) {
      console.error('[AuthContext] signOut error:', error);
    }
  }, []);

  // アプリ起動時に認証状態をチェック
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        authError,
        isInitialized,
        signIn: handleSignIn,
        signOut: handleSignOut,
        checkAuthStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * 認証状態を取得するフック
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
