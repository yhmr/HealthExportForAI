// Google Drive/Sheets カスタムフック（認証統合版）

import { useState, useCallback } from 'react';
import { useHealthStore, filterHealthDataByTags, type DataTagKey } from '../stores/healthStore';
import { executeExport } from '../services/export/controller';
import { GoogleDriveAdapter } from '../services/storage/googleDriveAdapter';
import { GoogleSheetsAdapter } from '../services/storage/googleSheetsAdapter';
import {
    configureGoogleSignIn,
    isSignedIn,
    getCurrentUser,
    signIn,
    signOut,
} from '../services/googleAuth';
import { loadDriveConfig, saveDriveConfig } from '../services/preferences';
import { type DriveConfig, WEB_CLIENT_ID } from '../config/driveConfig';
import { getCurrentISOString } from '../utils/formatters';
import type { User } from '@react-native-google-signin/google-signin';

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
     * exportControllerに処理を委譲
     * @param selectedTags エクスポートするデータタグのセット
     */
    const exportAndUpload = useCallback(async (selectedTags?: Set<DataTagKey>) => {
        if (!isConfigValid()) {
            setUploadError('サインインしてください');
            return false;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            // アダプターを初期化
            const storageAdapter = new GoogleDriveAdapter();
            const spreadsheetAdapter = new GoogleSheetsAdapter();

            // 選択されたタグでデータをフィルタリング
            const dataToExport = selectedTags
                ? filterHealthDataByTags(healthData, selectedTags)
                : healthData;

            // syncDateRangeを取得（取得期間の全日付）
            const { syncDateRange } = useHealthStore.getState();

            // exportControllerにエクスポート処理を委譲（アダプターを注入）
            const result = await executeExport(dataToExport, storageAdapter, spreadsheetAdapter, syncDateRange ?? undefined);

            // フォルダIDが新規作成された場合、設定を更新
            if (result.folderId && result.folderId !== driveConfig?.folderId) {
                const newConfig = {
                    ...driveConfig,
                    folderId: result.folderId,
                    folderName: driveConfig?.folderName || storageAdapter.defaultFolderName,
                };
                await saveConfig(newConfig);
            }

            if (!result.success) {
                // エラーがあれば表示
                const failedFormats = result.results.filter(r => !r.success);
                if (failedFormats.length > 0) {
                    const errorMessages = failedFormats.map(r => `${r.format}: ${r.error}`).join(', ');
                    setUploadError(`一部のエクスポートに失敗: ${errorMessages}`);
                } else if (result.error) {
                    setUploadError(result.error);
                }
            } else {
                setLastUploadTime(getCurrentISOString());
                const successCount = result.results.filter(r => r.success).length;
                console.log(`[Export] Successfully exported ${successCount} format(s)`);
            }

            return result.success;
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'エクスポートエラー');
            return false;
        } finally {
            setIsUploading(false);
        }
    }, [healthData, isConfigValid, driveConfig, saveConfig]);

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
    };
}
