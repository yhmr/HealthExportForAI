// Health Connect カスタムフック

import { useCallback, useState } from 'react';
import { loadLastSyncTime, loadSelectedDataTags } from '../services/config/exportConfig';
import {
  checkHealthConnectAvailability,
  checkHealthPermissions,
  initializeHealthConnect,
  requestBackgroundHealthPermission,
  requestHealthPermissions
} from '../services/healthConnect';
import { SyncService } from '../services/syncService';
import { useHealthStore } from '../stores/healthStore';
import { DataTagKey } from '../types/health';

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
    setSelectedDataTags
  } = useHealthStore();

  /**
   * Health Connectを初期化
   */
  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // SDKの利用可否をチェック
      const availabilityResult = await checkHealthConnectAvailability();
      if (!availabilityResult.isOk()) {
        setError(`Health Connect Check Error: ${availabilityResult.unwrapErr()}`);
        setIsInitialized(true);
        return false;
      }
      const availability = availabilityResult.unwrap();
      setIsAvailable(availability.available);

      if (!availability.available) {
        setError('Health Connectが利用できません');
        // 利用不可でも初期化チェック自体は完了とみなす
        setIsInitialized(true);
        return false;
      }

      // 初期化
      const initResult = await initializeHealthConnect();
      if (!initResult.isOk()) {
        setError(`Health Connect Init Error: ${initResult.unwrapErr()}`);
        setIsInitialized(true);
        return false;
      }

      const initialized = initResult.unwrap();
      setIsInitialized(initialized);

      if (initialized) {
        // 初期化成功時に権限状態もチェックする
        const permResult = await checkHealthPermissions();
        const hasPerms = permResult.unwrapOr(false);
        setHasPermissions(hasPerms);

        // 保存されたデータタグ設定を読み込む
        const savedTags = await loadSelectedDataTags();
        if (savedTags) {
          // 保存された設定があれば反映
          setSelectedDataTags(savedTags as DataTagKey[]);
        }

        // 保存された最終同期時刻を読み込む
        const savedTime = await loadLastSyncTime();
        if (savedTime) {
          setLastSyncTime(savedTime);
        }
        return true;
      } else {
        setError('Health Connectの初期化に失敗しました');
        setIsInitialized(true);
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '初期化エラー');
      setIsInitialized(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setSelectedDataTags, setLastSyncTime]);

  /**
   * 権限をリクエスト
   */
  const requestPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await requestHealthPermissions();
      const granted = result.unwrapOr(false);
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
   * データを取得
   * @param periodDays 取得する日数（指定がなければ設定から読み込み）
   */
  const fetchHealthData = useCallback(
    async (periodDays?: number) => {
      setLoading(true);
      setError(null);

      try {
        const { selectedDataTags } = useHealthStore.getState();
        const tags = Array.from(selectedDataTags || []);

        // 第2引数は forceFullSync (false), 第3引数にタグを渡す
        const result = await SyncService.fetchAndQueueNewData(periodDays, false, tags);

        if (result.isOk()) {
          const syncData = result.unwrap();
          if (syncData.success) {
            setAllData(syncData.data, syncData.dateRange);
            setLastSyncTime(syncData.endTime);
            return true;
          }
        } else {
          setError(`Sync failed: ${result.unwrapErr()}`);
        }
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : '取得エラー');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [setAllData, setLastSyncTime, setLoading, setError]
  );

  const requestBackgroundPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await requestBackgroundHealthPermission();
      const granted = result.unwrapOr(false);
      // バックグラウンド権限の結果のみで全体の権限状態を更新してよいかは
      // アプリの仕様によりますが、ここではユーザー実装に合わせて更新します
      if (granted) {
        setHasPermissions(true);
      } else {
        setError('バックグラウンド権限が付与されませんでした');
      }

      return granted;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'バックグラウンド権限リクエストエラー');
      return false;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

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
    fetchHealthData,
    /** Android 14+ 向けのバックグラウンド権限リクエスト */
    requestBackgroundPermissions
  };
}
