import { HealthData } from '../types/health';
import { generateDateRange, getCurrentISOString, getDateDaysAgo } from '../utils/formatters';
import { loadExportPeriodDays, loadLastSyncTime, saveLastSyncTime } from './config/exportConfig';
import { addDebugLog } from './debugLogService';
import { addToExportQueue } from './export/service';
import {
  checkHealthConnectAvailability,
  checkHealthPermissions,
  fetchAllHealthData,
  initializeHealthConnect
} from './healthConnect';

/** 最小取得日数 */
const MIN_FETCH_DAYS = 7;
/** 最大取得日数 */
const MAX_FETCH_DAYS = 30;

export interface SyncResult {
  success: boolean;
  data: HealthData;
  dateRange: Set<string>;
  startTime: string;
  endTime: string;
  isNewData: boolean; // 前回同期よりもデータが新しいか（簡易判定）
  queued: boolean; // エクスポートキューに追加されたか
}

/**
 * 同期サービス
 * フォアグラウンド(UI)とバックグラウンド(Task)で共通利用されるロジックを提供
 */
export const SyncService = {
  /**
   * Health Connectの状態確認と初期化
   */
  async initialize(): Promise<{
    available: boolean;
    initialized: boolean;
    hasPermissions: boolean;
  }> {
    const availability = await checkHealthConnectAvailability();
    if (!availability.available) {
      return { available: false, initialized: false, hasPermissions: false };
    }

    const initialized = await initializeHealthConnect();
    if (!initialized) {
      return { available: true, initialized: false, hasPermissions: false };
    }

    const hasPermissions = await checkHealthPermissions();
    return { available: true, initialized: true, hasPermissions };
  },

  /**
   * 同期実行（データ取得＋永続化）
   * @param periodDays 取得期間（日数）。指定がない場合は、前回同期からの差分または設定値を自動使用
   * @param forceFullSync 差分更新ではなく、全期間の再取得を強制するか
   * @param selectedTags エクスポート対象のデータタグ（指定された場合のみフィルタリング）
   */
  async performSync(
    periodDays?: number,
    forceFullSync: boolean = false,
    selectedTags?: string[]
  ): Promise<SyncResult> {
    try {
      await addDebugLog('[SyncService] Starting sync...', 'info');

      // 1. 取得期間の決定
      const fetchTimeRange = await this.calculateFetchTimeRange(periodDays, forceFullSync);
      const { startTime, endTime } = fetchTimeRange;

      await addDebugLog(
        `[SyncService] Fetching data from ${startTime.toISOString()} to ${endTime.toISOString()}`,
        'info'
      );

      // 2. データの取得
      const healthData = await fetchAllHealthData(startTime, endTime);

      // データが存在するか確認
      const hasData = Object.values(healthData).some((arr) => Array.isArray(arr) && arr.length > 0);

      // 取得期間の全日付セット生成
      const dateRange = generateDateRange(startTime, endTime);

      let queued = false;

      if (hasData) {
        // 成功時のみ同期時刻を更新（永続化）
        const now = getCurrentISOString();
        await saveLastSyncTime(now);
        await addDebugLog(`[SyncService] Sync success. LastSyncTime updated: ${now}`, 'success');

        // エクスポートキューへの追加
        // バックグラウンド/Widget/UI統一で、SyncServiceが責務を持つ

        // タグフィルタリング (selectedTagsが指定されている場合)
        let dataToQueue = healthData;
        /* Note: filterHealthDataByTags is in healthStore, creating circular dependency potentially if moved to service.
           Instead of filtering here, we can pass exportConfig with specific tags to addToExportQueue if that supported it,
           but addToExportQueue takes HealthData.
           
           Simplest approach: If selectedTags is provided, we filter the keys manually or use a helper.
           Since we don't want to depend on store logic here if possible. 
           But wait, addToExportQueue takes data and *config*.
           The queue processing logic re-reads config. 
           Actually, the queue entry stores `selectedTags`. 
           
           addToExportQueue source:
             const tags = Object.keys(healthData) as string[]; 
             // ...
             selectedTags: tags,
           
           It infers tags from the data keys. So we should filter the data.
        */

        if (selectedTags && selectedTags.length > 0) {
          const filteredData: any = {};
          selectedTags.forEach((tag) => {
            if ((healthData as any)[tag]) {
              filteredData[tag] = (healthData as any)[tag];
            }
          });
          // 他のキーは含めない
          dataToQueue = filteredData as HealthData;
        }

        queued = await addToExportQueue(dataToQueue, dateRange);
        if (queued) {
          await addDebugLog('[SyncService] Data automatically added to export queue', 'info');
        } else {
          await addDebugLog('[SyncService] Failed to add data to export queue', 'warn');
        }
      } else {
        await addDebugLog('[SyncService] No data found in range', 'info');
      }

      return {
        success: true,
        data: healthData,
        dateRange,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        isNewData: hasData,
        queued
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await addDebugLog(`[SyncService] Sync failed: ${errorMessage}`, 'error');
      throw error;
    }
  },

  /**
   * 取得期間の計算
   */
  async calculateFetchTimeRange(
    periodDays?: number,
    forceFullSync?: boolean
  ): Promise<{ startTime: Date; endTime: Date }> {
    const endTime = new Date(); // 現在時刻 (getEndOfToday() だと未来が含まれる可能性があるため、現在時刻までとするのが安全)

    // 明示的に日数が指定された場合、または強制フル同期の場合
    if (periodDays !== undefined || forceFullSync) {
      const days = periodDays ?? (await loadExportPeriodDays());
      const startTime = getDateDaysAgo(days);
      return { startTime, endTime };
    }

    // 差分更新判定
    const lastSyncTimeStr = await loadLastSyncTime();

    if (lastSyncTimeStr) {
      // 前回同期がある場合はそこから
      // ただし、安全のため少しだけ重複を持たせる（例: 数分前とか、あるいは前回同期時刻そのまま）
      // ここでは前回同期時刻をそのまま採用
      const lastSyncDate = new Date(lastSyncTimeStr);
      // あまりに古い場合は最大期間で制限するロジックを入れても良いが、
      // HealthConnectは制限があるので、ここでは自動計算ロジック（backgroundTaskにあったもの）を統合

      // 経過日数を計算
      const daysSinceLastSync = Math.ceil(
        (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 最小7日、最大30日の範囲で調整（バックグラウンドロジックを踏襲）
      // ※フォアグラウンドでも「久しぶりに開いたとき」はこれでカバーできる
      const fetchDays = Math.min(Math.max(daysSinceLastSync, MIN_FETCH_DAYS), MAX_FETCH_DAYS);
      const startTime = getDateDaysAgo(fetchDays);

      return { startTime, endTime };
    } else {
      // 初回同期（LastSyncTimeなし）
      const days = await loadExportPeriodDays();
      const startTime = getDateDaysAgo(days);
      return { startTime, endTime };
    }
  }
};
