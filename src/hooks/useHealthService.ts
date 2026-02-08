// Health Connect カスタムフック

import { useCallback, useState } from 'react';
import { exportConfigService } from '../services/config/ExportConfigService';
import { healthService } from '../services/health/healthAdapterFactory';
import { SyncService } from '../services/syncService';
import { useHealthStore } from '../stores/healthStore';
import { DataTagKey } from '../types/health';

export function useHealthService() {
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
      const availabilityResult = await healthService.checkAvailability();
      if (!availabilityResult.isOk()) {
        setError(`Health Connect Check Error: ${availabilityResult.unwrapErr()}`);
        setIsInitialized(true);
        return false;
      }
      const available = availabilityResult.unwrap();
      setIsAvailable(available);

      if (!available) {
        setError('ヘルスケアサービスが利用できません');
        // 利用不可でも初期化チェック自体は完了とみなす
        setIsInitialized(true);
        return false;
      }

      // 初期化
      const initResult = await healthService.initialize();
      if (!initResult.isOk()) {
        setError(`Health Connect Init Error: ${initResult.unwrapErr()}`);
        setIsInitialized(true);
        return false;
      }

      const initialized = initResult.unwrap();
      setIsInitialized(initialized);

      if (initialized) {
        // 初期化成功時に権限状態もチェックする
        const permResult = await healthService.hasPermissions();
        const hasPerms = permResult.unwrapOr(false);
        setHasPermissions(hasPerms);

        // 保存されたデータタグ設定を読み込む
        const savedTags = await exportConfigService.loadSelectedDataTags();
        if (savedTags) {
          // 保存された設定があれば反映
          setSelectedDataTags(savedTags as DataTagKey[]);
        }

        // 保存された最終同期時刻を読み込む
        const savedTime = await exportConfigService.loadLastSyncTime();
        if (savedTime) {
          setLastSyncTime(savedTime);
        }
        return true;
      } else {
        setError('ヘルスケアサービスの初期化に失敗しました');
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
      const result = await healthService.requestPermissions();
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

  /**
   * 権限状態を明示的に再チェックしてstateを更新する
   */
  const checkPermissions = useCallback(async () => {
    // ローディング表示はしない（バックグラウンドチェック用）
    const permResult = await healthService.hasPermissions();
    const hasPerms = permResult.unwrapOr(false);
    setHasPermissions(hasPerms);
    return hasPerms;
  }, []);

  const requestBackgroundPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await healthService.requestBackgroundPermission();
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
    requestBackgroundPermissions,
    checkPermissions,
    /** ヘルスケア設定画面を開く */
    openHealthSettings: healthService.openDataManagement
  };
}
