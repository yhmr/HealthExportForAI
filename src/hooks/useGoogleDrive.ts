// Google Drive/Sheets カスタムフック（認証統合版）

import { useCallback, useState } from 'react';
import { WEB_CLIENT_ID, type DriveConfig } from '../config/driveConfig';
import { useAuth } from '../contexts/AuthContext';
import { loadDriveConfig, saveDriveConfig } from '../services/config/driveConfig';
import { handleExportRequest } from '../services/export/controller';
import { configureGoogleSignIn } from '../services/googleAuth';
import { getNetworkStatus } from '../services/networkService';
import { filterHealthDataByTags, useHealthStore, type DataTagKey } from '../stores/healthStore';
import { getCurrentISOString } from '../utils/formatters';

export function useGoogleDrive() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastUploadTime, setLastUploadTime] = useState<string | null>(null);
  const [driveConfig, setDriveConfigState] = useState<DriveConfig | null>(null);

  // 認証状態はAuthContextから取得
  const { isAuthenticated, currentUser, authError, signIn, signOut } = useAuth();

  const { healthData } = useHealthStore();

  /**
   * Drive設定を読み込み
   * 認証状態はAuthContextで管理されるため、ここではDrive設定のみ読み込む
   */
  const loadConfig = useCallback(async () => {
    const config = await loadDriveConfig();
    setDriveConfigState(config);

    // Google Sign-Inを設定（埋め込みIDを使用）
    configureGoogleSignIn(WEB_CLIENT_ID);

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
    signIn,
    signOut,
    clearUploadError
  };
}
