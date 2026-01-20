// Health Connect カスタムフック

import { useCallback, useState } from 'react';
import { loadExportPeriodDays, saveLastSyncTime } from '../services/config/exportConfig';
import {
  checkHealthConnectAvailability,
  fetchAllHealthData,
  initializeHealthConnect,
  requestHealthPermissions
} from '../services/healthConnect';
import { useHealthStore } from '../stores/healthStore';
import {
  generateDateRange,
  getCurrentISOString,
  getDateDaysAgo,
  getEndOfToday
} from '../utils/formatters';

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
    setError
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
   * @param periodDays 取得する日数（指定がなければ設定から読み込み）
   */
  const syncData = useCallback(
    async (periodDays?: number) => {
      setLoading(true);
      setError(null);

      try {
        // 引数で日数が指定されていればそれを使用、なければ設定から読み込み
        const days = periodDays ?? (await loadExportPeriodDays());
        const startTime = getDateDaysAgo(days);
        const endTime = getEndOfToday();

        // 取得期間の全日付を生成
        const dateRange = generateDateRange(startTime, endTime);

        const data = await fetchAllHealthData(startTime, endTime);
        setAllData(data, dateRange);

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
    },
    [setAllData, setLastSyncTime, setLoading, setError]
  );

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
    syncData
  };
}
