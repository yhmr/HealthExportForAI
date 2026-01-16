// Google Drive カスタムフック（認証統合版）

import { useState, useCallback, useEffect } from 'react';
import { useHealthStore } from '../stores/healthStore';
import {
    saveJsonToFile,
    uploadToDrive,
    generateExportFileName,
} from '../services/googleDrive';
import {
    configureGoogleSignIn,
    isSignedIn,
    getCurrentUser,
    signIn,
    signOut,
    getAccessToken,
} from '../services/googleAuth';
import { loadDriveConfig, saveDriveConfig, loadExportPeriodDays } from '../services/storage';
import { isValidDriveConfig, type DriveConfig } from '../config/driveConfig';
import { getDateDaysAgo, getEndOfToday, getCurrentISOString } from '../utils/formatters';
import type { ExportData } from '../types/health';
import type { User } from '@react-native-google-signin/google-signin';

// Google Cloud ConsoleのWeb Client ID（ユーザーが設定で入力）
const DEFAULT_WEB_CLIENT_ID = '';

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

        // Google Sign-Inを設定
        if (config.clientId) {
            configureGoogleSignIn(config.clientId);
        }

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

        // 新しいclientIdでGoogle Sign-Inを再設定
        if (config.clientId) {
            configureGoogleSignIn(config.clientId);
        }
    }, []);

    /**
     * Googleアカウントでサインイン
     */
    const handleSignIn = useCallback(async () => {
        setAuthError(null);

        // clientIdが設定されているか確認
        if (!driveConfig?.clientId) {
            setAuthError('Web Client IDを設定してください');
            return false;
        }

        configureGoogleSignIn(driveConfig.clientId);
        const result = await signIn();

        if (result.success && result.user) {
            setIsAuthenticated(true);
            setCurrentUser(result.user);
            return true;
        } else {
            setAuthError(result.error || 'サインインに失敗しました');
            return false;
        }
    }, [driveConfig]);

    /**
     * サインアウト
     */
    const handleSignOut = useCallback(async () => {
        await signOut();
        setIsAuthenticated(false);
        setCurrentUser(null);
    }, []);

    /**
     * 設定が有効かチェック（認証済みまたは手動トークン）
     */
    const isConfigValid = useCallback(() => {
        if (!driveConfig) return false;

        // フォルダIDは必須
        if (!driveConfig.folderId) return false;

        // 認証済みまたは手動トークンがあればOK
        return isAuthenticated || Boolean(driveConfig.accessToken);
    }, [driveConfig, isAuthenticated]);

    /**
     * データをエクスポートしてDriveにアップロード
     */
    const exportAndUpload = useCallback(async () => {
        if (!driveConfig) {
            setUploadError('Drive設定がありません');
            return false;
        }

        if (!isConfigValid()) {
            setUploadError('サインインするか、アクセストークンを設定してください');
            return false;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            const periodDays = await loadExportPeriodDays();
            const startTime = getDateDaysAgo(periodDays);
            const endTime = getEndOfToday();

            // エクスポートデータを作成
            const exportData: ExportData = {
                exportedAt: getCurrentISOString(),
                period: {
                    start: startTime.toISOString(),
                    end: endTime.toISOString(),
                },
                data: healthData,
            };

            // ファイルに保存
            const fileName = generateExportFileName();
            const fileUri = await saveJsonToFile(exportData, fileName);

            // Driveにアップロード
            const result = await uploadToDrive(fileUri, fileName, driveConfig);

            if (!result.success) {
                setUploadError(result.error || 'アップロード失敗');
                return false;
            }

            setLastUploadTime(getCurrentISOString());
            return true;
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'エクスポートエラー');
            return false;
        } finally {
            setIsUploading(false);
        }
    }, [driveConfig, healthData, isConfigValid]);

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
