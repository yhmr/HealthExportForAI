// Health Connect カスタムフック

import { useCallback, useState } from 'react';
import {
  loadExportPeriodDays,
  loadSelectedDataTags,
  saveLastSyncTime
} from '../services/config/exportConfig';
import {
  checkHealthConnectAvailability,
  checkHealthPermissions,
  fetchAllHealthData,
  initializeHealthConnect,
  requestBackgroundHealthPermission,
  requestHealthPermissions
} from '../services/healthConnect';
import { useHealthStore, DataTagKey } from '../stores/healthStore';
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
          // 保存された設定があれば反映（バリデーションとしてHealthDataのキーに含まれるか確認してもよいが、一旦そのままキャスト）
          setSelectedDataTags(savedTags as DataTagKey[]);
        }
      }

      if (!initialized) {
        setError('Health Connectの初期化に失敗しました');
        // 初期化失敗時はリトライ可能にするため false のままにするか、
        // あるいはエラーを表示して完了とするか。
        // ここでは false のままにしておき、呼び出し元でエラーハンドリングさせるのが筋だが、
        // 初期化待ちでブロックする実装の場合は true にしないと進まない。
        // UI側で error があれば isInitialized が false でも表示するようにするか、
        // ここで true にしてしまうか。
        // 今回は initialized の結果をそのまま入れているので、失敗なら false。
        // これだと index.tsx で詰む。
        // なので、initialized (SDKの初期化成功) と isInitialized (アプリの準備完了) を分けるべきだが、
        // 修正範囲を抑えるため、失敗時も isInitialized = true にして、エラーで判断させる。
        setIsInitialized(true);
        return false;
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '初期化エラー');
      // エラー時もチェック完了とする
      setIsInitialized(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setSelectedDataTags]);

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
        // 差分更新のロジック:
        // 1. 最終同期時刻 (lastSyncTime) がある場合は、そこから現在までを取得
        // 2. ない場合は、期間設定 (periodDays) 分だけ過去から取得

        // 引数で明示的に日数が指定された場合は、それを優先して初期取得（再構築）とみなすこともできるが、
        // ここでは「引数periodDaysが未指定」かつ「lastSyncTimeあり」なら差分更新とする。
        // UI側で「再構築」ボタンを作る場合は、明示的に期間を指定して呼ぶか、lastSyncTimeをクリアしてから呼ぶ形になる。
        // ユーザーが「日数を変更」した直後などはどうする？ -> 今回の仕様ではメイン画面から期間選択が消えるので、
        // periodDaysは「初期設定」または「設定画面での設定」になる。

        let startTime: Date;
        const endTime = new Date(); // 現在時刻

        // 元の実装の getEndOfToday は「今日の終わり」なので未来も含む可能性があるが、
        // HealthConnectは未来のデータは基本ない。
        // 差分更新の場合、前回同期時刻(lastSyncTime) ～ 現在(new Date()) とするのが自然。

        if (!periodDays && lastSyncTime) {
          console.log('[Sync] Performing differential sync from:', lastSyncTime);
          startTime = new Date(lastSyncTime);
        } else {
          // 初期取得、または明示的な期間指定（再構築など）
          const days = periodDays ?? (await loadExportPeriodDays());
          console.log('[Sync] Performing full sync for days:', days);
          startTime = getDateDaysAgo(days);
        }

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
    [setAllData, setLastSyncTime, setLoading, setError, lastSyncTime]
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
