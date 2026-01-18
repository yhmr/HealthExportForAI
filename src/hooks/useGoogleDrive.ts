// Google Drive/Sheets カスタムフック（認証統合版）

import { useState, useCallback } from 'react';
import { useHealthStore } from '../stores/healthStore';
import { exportToSpreadsheet } from '../services/exportService';
import { DEFAULT_FOLDER_NAME } from '../services/googleDrive';
import {
    configureGoogleSignIn,
    isSignedIn,
    getCurrentUser,
    signIn,
    signOut,
} from '../services/googleAuth';
import { loadDriveConfig, saveDriveConfig } from '../services/storage';
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
     * データをスプレッドシートにエクスポート
     */
    const exportAndUpload = useCallback(async () => {
        if (!isConfigValid()) {
            setUploadError('サインインしてください');
            return false;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            const result = await exportToSpreadsheet(healthData, driveConfig?.folderId, driveConfig?.folderName);

            if (!result.success) {
                setUploadError(result.error || 'エクスポート失敗');
                return false;
            }

            // フォルダが新規作成された場合（IDがなかった場合）、設定に保存
            // デフォルト名で作成されたので、名前も一緒に保存する
            if (result.folderId && result.folderId !== driveConfig?.folderId) {
                const newConfig = {
                    ...driveConfig,
                    folderId: result.folderId,
                    folderName: driveConfig?.folderName || DEFAULT_FOLDER_NAME,
                };
                await saveConfig(newConfig);
            }

            setLastUploadTime(getCurrentISOString());
            return true;
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
