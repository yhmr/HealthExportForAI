// Google Drive/Sheets カスタムフック（認証統合版）

import type { User } from '@react-native-google-signin/google-signin';
import { useCallback, useState } from 'react';
import { WEB_CLIENT_ID, type DriveConfig } from '../config/driveConfig';
import { loadDriveConfig, saveDriveConfig } from '../services/config/driveConfig';
import { handleExportRequest } from '../services/export/controller';
import {
  configureGoogleSignIn,
  getCurrentUser,
  isSignedIn,
  signIn,
  signOut
} from '../services/googleAuth';
import { getNetworkStatus } from '../services/networkService';
import { filterHealthDataByTags, useHealthStore, type DataTagKey } from '../stores/healthStore';
import { getCurrentISOString } from '../utils/formatters';

export function useGoogleDrive() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastUploadTime, setLastUploadTime] = useState<string | null>(null);
  const [driveConfig, setDriveConfigState] = useState<DriveConfig | null>(null);

  // 認証状態
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const { healthData } = useHealthStore();

  /**
   * Drive設定を読み込み
   */
  const loadConfig = useCallback(async () => {
    const config = await loadDriveConfig();
    setDriveConfigState(config);

    // Google Sign-Inを設定（埋め込みIDを使用）
    configureGoogleSignIn(WEB_CLIENT_ID);

    // 認証状態をチェック
    const signedIn = await isSignedIn();
    setIsAuthenticated(signedIn);
    if (signedIn) {
      const user = await getCurrentUser();
      setCurrentUser(user);
    }

    return config;
  }, []);

  /**
   * Drive設定を保存
   */
  const saveConfig = useCallback(async (config: DriveConfig) => {
    await saveDriveConfig(config);
    setDriveConfigState(config);
  }, []);

  /**
   * Googleアカウントでサインイン
   */
  const handleSignIn = useCallback(async () => {
    setAuthError(null);

    configureGoogleSignIn(WEB_CLIENT_ID);
    const result = await signIn();

    if (result.success && result.user) {
      setIsAuthenticated(true);
      setCurrentUser(result.user);
      return true;
    } else {
      console.error('Sign in failed:', result.error);
      setAuthError(result.error || 'サインインに失敗しました');
      return false;
    }
  }, []);

  /**
   * サインアウト
   */
  const handleSignOut = useCallback(async () => {
    await signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
  }, []);

  /**
   * 認証済みかチェック
   */
  const isConfigValid = useCallback(() => {
    // 認証済みであればOK
    return isAuthenticated;
  }, [isAuthenticated]);

  /**
   * データをエクスポート
   * processorのhandleExportRequestに処理を委譲
   * オンラインなら即時実行、オフラインならキューに追加
   * @param selectedTags エクスポートするデータタグのセット
   * @returns { success: boolean, queued?: boolean } 成功/キュー追加の結果
   */
  const exportAndUpload = useCallback(
    async (selectedTags?: Set<DataTagKey>) => {
      if (!isConfigValid()) {
        setUploadError('サインインしてください');
        return { success: false };
      }

      // 選択されたタグでデータをフィルタリング
      const dataToExport = selectedTags
        ? filterHealthDataByTags(healthData, selectedTags)
        : healthData;

      // syncDateRangeを取得（取得期間の全日付）
      const { syncDateRange } = useHealthStore.getState();
      const dateRange = syncDateRange ?? new Set<string>();

      setIsUploading(true);
      setUploadError(null);

      try {
        // processorに処理を委譲（オンラインなら実行、オフラインならキュー）
        const success = await handleExportRequest(dataToExport, dateRange);

        if (success) {
          setLastUploadTime(getCurrentISOString());
          console.log('[useGoogleDrive] Export completed successfully');
          return { success: true };
        } else {
          // キューに追加された場合（オフラインまたは失敗）
          const networkStatus = await getNetworkStatus();
          if (networkStatus !== 'online') {
            console.log('[useGoogleDrive] Offline: Added to queue');
            return { success: true, queued: true };
          } else {
            setUploadError('エクスポートに失敗しました。後で再試行されます。');
            return { success: false };
          }
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'エクスポートエラー');
        return { success: false };
      } finally {
        setIsUploading(false);
      }
    },
    [healthData, isConfigValid]
  );

  /**
   * アップロードエラーをクリア
   */
  const clearUploadError = useCallback(() => {
    setUploadError(null);
  }, []);

  return {
    // 状態
    isUploading,
    uploadError,
    lastUploadTime,
    driveConfig,
    // 認証状態
    isAuthenticated,
    currentUser,
    authError,
    // アクション
    loadConfig,
    saveConfig,
    isConfigValid,
    exportAndUpload,
    signIn: handleSignIn,
    signOut: handleSignOut,
    clearUploadError
  };
}
