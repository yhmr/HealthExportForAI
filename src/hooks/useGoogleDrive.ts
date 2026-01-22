// Google Drive/Sheets カスタムフック（認証統合版）

import { useCallback, useState } from 'react';
import { WEB_CLIENT_ID, type DriveConfig } from '../config/driveConfig';
import { useAuth } from '../contexts/AuthContext';
import { loadDriveConfig, saveDriveConfig } from '../services/config/driveConfig';
import { addDebugLog } from '../services/debugLogService';
import { addToExportQueue, processExportQueue } from '../services/export/service';
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
   * まずキューに追加し（永続化）、オンラインなら即時処理を試みる
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
        // 1. まずキューに追加（永続化）
        // 手動実行時はその時点の設定(Default)を使用するためconfig引数は省略
        const queued = await addToExportQueue(dataToExport, dateRange);

        if (!queued) {
          setUploadError('キューへの追加に失敗しました');
          return { success: false };
        }

        // 2. オンラインなら即時処理
        const networkStatus = await getNetworkStatus();
        if (networkStatus === 'online') {
          await addDebugLog('[useGoogleDrive] Online: Processing queue immediately', 'info');
          const result = await processExportQueue();

          if (result.successCount > 0) {
            setLastUploadTime(getCurrentISOString());
            await addDebugLog('[useGoogleDrive] Export completed successfully', 'success');
            return { success: true };
          } else if (result.errors.length > 0) {
            setUploadError(`エクスポート失敗: ${result.errors[0]}`);
            return { success: false };
          } else {
            // 成功0, エラー0 の場合は「処理すべきものがなかった」だが、
            // addToQueueした直後なので通常はありえない。
            // 他のプロセスが同時に処理した可能性がある。
            return { success: true };
          }
        } else {
          await addDebugLog('[useGoogleDrive] Offline: Added to queue', 'info');
          return { success: true, queued: true };
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
