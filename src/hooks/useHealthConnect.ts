// Health Connect カスタムフック

import { useState, useCallback } from 'react';
import { useHealthStore } from '../stores/healthStore';
import {
    initializeHealthConnect,
    checkHealthConnectAvailability,
    requestHealthPermissions,
    fetchAllHealthData,
} from '../services/healthConnect';
import { getDateDaysAgo, getEndOfToday, getCurrentISOString } from '../utils/formatters';
import { saveLastSyncTime, loadExportPeriodDays } from '../services/storage';

export function useHealthConnect() {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isAvailable, setIsAvailable] = useState(false);
    const [hasPermissions, setHasPermissions] = useState(false);

    const {
        healthData,
        lastSyncTime,
        isLoading,
        error,
        setAllData,
        setLastSyncTime,
        setLoading,
        setError,
    } = useHealthStore();

    /**
     * Health Connectを初期化
     */
    const initialize = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // SDKの利用可否をチェック
            const availability = await checkHealthConnectAvailability();
            setIsAvailable(availability.available);

            if (!availability.available) {
                setError('Health Connectが利用できません');
                return false;
            }

            // 初期化
            const initialized = await initializeHealthConnect();
            setIsInitialized(initialized);

            if (!initialized) {
                setError('Health Connectの初期化に失敗しました');
                return false;
            }

            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '初期化エラー');
            return false;
        } finally {
            setLoading(false);
        }
    }, [setLoading, setError]);

    /**
     * 権限をリクエスト
     */
    const requestPermissions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const granted = await requestHealthPermissions();
            setHasPermissions(granted);

            if (!granted) {
                setError('権限が付与されませんでした');
            }

            return granted;
        } catch (err) {
            setError(err instanceof Error ? err.message : '権限リクエストエラー');
            return false;
        } finally {
            setLoading(false);
        }
    }, [setLoading, setError]);

    /**
     * データを同期
     */
    const syncData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const periodDays = await loadExportPeriodDays();
            const startTime = getDateDaysAgo(periodDays);
            const endTime = getEndOfToday();

            const data = await fetchAllHealthData(startTime, endTime);
            setAllData(data);

            const syncTime = getCurrentISOString();
            setLastSyncTime(syncTime);
            await saveLastSyncTime(syncTime);

            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '同期エラー');
            return false;
        } finally {
            setLoading(false);
        }
    }, [setAllData, setLastSyncTime, setLoading, setError]);

    return {
        // 状態
        isInitialized,
        isAvailable,
        hasPermissions,
        healthData,
        lastSyncTime,
        isLoading,
        error,
        // アクション
        initialize,
        requestPermissions,
        syncData,
    };
}
