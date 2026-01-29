// Google Drive/Sheets カスタムフック（認証統合版）

import { useCallback, useState } from 'react';
import { WEB_CLIENT_ID, type DriveConfig } from '../config/driveConfig';
import { useAuth } from '../contexts/AuthContext';
import { loadDriveConfig, saveDriveConfig } from '../services/config/driveConfig';
import { addDebugLog } from '../services/debugLogService';
import { processExportQueue } from '../services/export/service';
import { googleAuthService } from '../services/infrastructure/GoogleAuthService';
import { getNetworkStatus } from '../services/networkService';
import { DEFAULT_FOLDER_NAME, getFolder } from '../services/storage/googleDrive';
import { getCurrentISOString } from '../utils/formatters';

export function useGoogleDrive() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastUploadTime, setLastUploadTime] = useState<string | null>(null);
  const [driveConfig, setDriveConfigState] = useState<DriveConfig | null>(null);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  // 認証状態はAuthContextから取得
  const { isAuthenticated, currentUser, authError, signIn, signOut } = useAuth();

  /**
   * Drive設定を読み込み
   * 認証状態はAuthContextで管理されるため、ここではDrive設定のみ読み込む
   */
  const loadConfig = useCallback(async () => {
    try {
      const config = await loadDriveConfig();
      setDriveConfigState(config);
      // Google Sign-Inを設定（埋め込みIDを使用）
      googleAuthService.configure(WEB_CLIENT_ID);
      return config;
    } finally {
      setIsConfigLoaded(true);
    }
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
  const exportAndUpload = useCallback(async () => {
    if (!isConfigValid()) {
      setUploadError('サインインしてください');
      return { success: false };
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Queueへの追加はSyncServiceで行われている前提
      // ここでは処理のみを行う

      // オンラインなら即時処理
      const networkStatus = await getNetworkStatus();
      if (networkStatus === 'online') {
        await addDebugLog('[useGoogleDrive] Online: Processing queue immediately', 'info');
        const result = await processExportQueue();

        if (result.successCount > 0) {
          setLastUploadTime(getCurrentISOString());
          await addDebugLog('[useGoogleDrive] Export completed successfully', 'success');
          return { success: true };
        } else if (result.errors.length > 0) {
          // エラーがあったが、部分成功している可能性もある
          if (result.successCount === 0) {
            setUploadError(`エクスポート失敗: ${result.errors[0]}`);
            return { success: false };
          }
          return { success: true };
        } else {
          // キューが空だった場合（SyncServiceで追加されなかった、または既に処理された）
          await addDebugLog('[useGoogleDrive] Queue empty or processed elsewhere', 'info');
          return { success: true };
        }
      } else {
        await addDebugLog('[useGoogleDrive] Offline: Queue processing deferred', 'info');
        return { success: true, queued: true };
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'エクスポートエラー');
      return { success: false };
    } finally {
      setIsUploading(false);
    }
  }, [isConfigValid]);

  /**
   * アップロードエラーをクリア
   */
  const clearUploadError = useCallback(() => {
    setUploadError(null);
  }, []);

  /**
   * フォルダIDから名前を解決して保存
   * 認証済みでない場合や見つからない場合はデフォルト名を返す
   */
  const resolveAndSaveFolder = useCallback(
    async (folderId: string): Promise<string> => {
      if (!folderId) return DEFAULT_FOLDER_NAME;

      try {
        // 既存の設定を確認（名前があればAPI呼ばない）
        if (driveConfig?.folderId === folderId && driveConfig?.folderName) {
          return driveConfig.folderName;
        }

        const tokenResult = await googleAuthService.getOrRefreshAccessToken();
        if (tokenResult.isErr()) {
          console.error('[useGoogleDrive] Failed to get token:', tokenResult.unwrapErr());
          return DEFAULT_FOLDER_NAME;
        }

        const token = tokenResult.unwrap();
        if (!token) return DEFAULT_FOLDER_NAME;

        const folderResult = await getFolder(folderId, token);
        if (folderResult.isOk()) {
          const folder = folderResult.unwrap();
          if (folder) {
            const newConfig = { folderId, folderName: folder.name };
            await saveDriveConfig(newConfig);
            setDriveConfigState(newConfig);
            return folder.name;
          }
        } else {
          console.error('[useGoogleDrive] getFolder error:', folderResult.unwrapErr());
        }

        // 見つからない場合やエラーの場合は設定をクリア
        const emptyConfig = { folderId: '', folderName: '' };
        await saveDriveConfig(emptyConfig);
        setDriveConfigState(emptyConfig);
        return DEFAULT_FOLDER_NAME;
      } catch (error) {
        console.error('[useGoogleDrive] resolveFolder error:', error);
        return DEFAULT_FOLDER_NAME;
      }
    },
    [driveConfig]
  );

  return {
    // 状態
    isUploading,
    uploadError,
    lastUploadTime,
    driveConfig,
    isConfigLoaded,
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
    clearUploadError,
    resolveAndSaveFolder
  };
}
