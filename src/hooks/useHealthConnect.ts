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
import { DataTagKey, useHealthStore } from '../stores/healthStore';

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
      const availability = await checkHealthConnectAvailability();
      setIsAvailable(availability.available);

      if (!availability.available) {
        setError('Health Connectが利用できません');
        // 利用不可でも初期化チェック自体は完了とみなす
        setIsInitialized(true);
        return false;
      }

      // 初期化
      const initialized = await initializeHealthConnect();
      setIsInitialized(initialized);

      if (initialized) {
        // 初期化成功時に権限状態もチェックする
        const hasPerms = await checkHealthPermissions();
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
      }

      if (!initialized) {
        setError('Health Connectの初期化に失敗しました');
        setIsInitialized(true);
        return false;
      }

      return true;
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
        const { selectedDataTags } = useHealthStore.getState();
        const tags = Array.from(selectedDataTags || []);

        // 第2引数は forceFullSync (false), 第3引数にタグを渡す
        const result = await SyncService.performSync(periodDays, false, tags);

        if (result.success) {
          setAllData(result.data, result.dateRange);
          setLastSyncTime(result.endTime);
          return true;
        }
        return false;
      } catch (err) {
        setError(err instanceof Error ? err.message : '同期エラー');
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
      const granted = await requestBackgroundHealthPermission();
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
    syncData,
    /** Android 14+ 向けのバックグラウンド権限リクエスト */
    requestBackgroundPermissions
  };
}
