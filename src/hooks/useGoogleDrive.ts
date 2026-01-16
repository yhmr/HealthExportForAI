// Google Drive カスタムフック

import { useState, useCallback } from 'react';
import { useHealthStore } from '../stores/healthStore';
import {
    saveJsonToFile,
    uploadToDrive,
    generateExportFileName,
} from '../services/googleDrive';
import { loadDriveConfig, saveDriveConfig, loadExportPeriodDays } from '../services/storage';
import { isValidDriveConfig, type DriveConfig } from '../config/driveConfig';
import { getDateDaysAgo, getEndOfToday, getCurrentISOString } from '../utils/formatters';
import type { ExportData } from '../types/health';

export function useGoogleDrive() {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [lastUploadTime, setLastUploadTime] = useState<string | null>(null);
    const [driveConfig, setDriveConfigState] = useState<DriveConfig | null>(null);

    const { healthData } = useHealthStore();

    /**
     * Drive設定を読み込み
     */
    const loadConfig = useCallback(async () => {
        const config = await loadDriveConfig();
        setDriveConfigState(config);
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
     * 設定が有効かチェック
     */
    const isConfigValid = useCallback(() => {
        return driveConfig ? isValidDriveConfig(driveConfig) : false;
    }, [driveConfig]);

    /**
     * データをエクスポートしてDriveにアップロード
     */
    const exportAndUpload = useCallback(async () => {
        if (!driveConfig || !isValidDriveConfig(driveConfig)) {
            setUploadError('Drive設定が無効です');
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
    }, [driveConfig, healthData]);

    return {
        // 状態
        isUploading,
        uploadError,
        lastUploadTime,
        driveConfig,
        // アクション
        loadConfig,
        saveConfig,
        isConfigValid,
        exportAndUpload,
    };
}
