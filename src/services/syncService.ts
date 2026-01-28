import { HealthData } from '../types/health';
import { generateDateRange, getCurrentISOString, getDateDaysAgo } from '../utils/formatters';
import {
  createDefaultExportConfig,
  ExportConfigService,
  exportConfigService
} from './config/exportConfig';
import { Filter } from './data/Filter';
import { addDebugLog } from './debugLogService';
import { queueManager, QueueManager } from './export/QueueManager';
import { processExportQueue, ProcessQueueResult } from './export/service';
import { AccessChecker } from './health/AccessChecker';
import { Fetcher } from './health/Fetcher';

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
  isNewData: boolean;
  queued: boolean;
}

/**
 * 同期サービスの実装クラス
 * 機能ごとのサービスクラスを統括するオーケストレーター
 */
export class SyncServiceImpl {
  constructor(
    private accessChecker: AccessChecker,
    private fetcher: Fetcher,
    private filter: Filter,
    private queueManager: QueueManager,
    private configService: ExportConfigService
  ) {}

  /**
   * Health Connectの状態確認と初期化
   */
  async initialize(): Promise<{
    available: boolean;
    initialized: boolean;
    hasPermissions: boolean;
  }> {
    const availability = await this.accessChecker.checkAvailability();
    if (!availability.available) {
      return { available: false, initialized: false, hasPermissions: false };
    }

    const initialized = await this.accessChecker.initialize();
    if (!initialized) {
      return { available: true, initialized: false, hasPermissions: false };
    }

    const hasPermissions = await this.accessChecker.hasPermissions();
    return { available: true, initialized: true, hasPermissions };
  }

  /**
   * 同期実行（データ取得＋永続化）
   * @param periodDays 取得期間（日数）。指定がない場合は、前回同期からの差分または設定値を自動使用
   * @param forceFullSync 差分更新ではなく、全期間の再取得を強制するか
   * @param selectedTags エクスポート対象のデータタグ（指定された場合のみフィルタリング）
   */
  async fetchAndQueueNewData(
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

      // 2. データの取得 (Fetcher利用)
      const healthData = await this.fetcher.fetchAllData(startTime, endTime);

      // データが存在するか確認
      const hasData = Object.values(healthData).some((arr) => Array.isArray(arr) && arr.length > 0);

      // 取得期間の全日付セット生成
      const dateRange = generateDateRange(startTime, endTime);

      let queued = false;

      if (hasData) {
        // 成功時のみ同期時刻を更新（永続化）
        const now = getCurrentISOString();
        await this.configService.saveLastSyncTime(now);
        await addDebugLog(`[SyncService] Sync success. LastSyncTime updated: ${now}`, 'success');

        // タグフィルタリング (Filter利用)
        let dataToQueue = healthData;
        if (selectedTags && selectedTags.length > 0) {
          dataToQueue = this.filter.filterByTags(healthData, selectedTags);
        }

        // 3. エクスポートキューへの追加 (QueueManager利用)
        const exportConfig = await createDefaultExportConfig();
        const tags = Object.keys(dataToQueue) as string[];

        const queueId = await this.queueManager.addToQueue({
          healthData: dataToQueue,
          selectedTags: tags,
          syncDateRange: Array.from(dateRange),
          exportConfig
        });

        queued = !!queueId;

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
  }

  /**
   * 同期とアップロードを一括実行 (Facade)
   * 1. データの取得とキューイング (Phase 1)
   * 2. 成功したらアップロード試行 (Phase 2)
   */
  async executeFullSync(
    periodDays?: number,
    forceFullSync: boolean = false,
    selectedTags?: string[]
  ): Promise<{ syncResult: SyncResult; exportResult?: ProcessQueueResult | null }> {
    // 1. データ取得 & キューイング
    const syncResult = await this.fetchAndQueueNewData(periodDays, forceFullSync, selectedTags);

    let exportResult = null;

    // 2. 取得に成功し、かつ新しいデータがキューに追加された場合、またはキューに未処理が残っている場合
    if (syncResult.success) {
      // オフライン判定等は processExportQueue 側で行われるため、ここでは単に呼び出す
      exportResult = await processExportQueue();
    }

    return {
      syncResult,
      exportResult
    };
  }

  /**
   * 取得期間の計算 (内部利用)
   */
  private async calculateFetchTimeRange(
    periodDays?: number,
    forceFullSync?: boolean
  ): Promise<{ startTime: Date; endTime: Date }> {
    const endTime = new Date(); // 現在時刻 (getEndOfToday() だと未来が含まれる可能性があるため、現在時刻までとするのが安全)

    // 明示的に日数が指定された場合、または強制フル同期の場合
    if (periodDays !== undefined || forceFullSync) {
      const days = periodDays ?? (await this.configService.loadExportPeriodDays());
      const startTime = getDateDaysAgo(days);
      return { startTime, endTime };
    }

    // 差分更新判定
    const lastSyncTimeStr = await this.configService.loadLastSyncTime();

    if (lastSyncTimeStr) {
      // 前回同期がある場合はそこから
      const lastSyncDate = new Date(lastSyncTimeStr);

      // 経過日数を計算
      const daysSinceLastSync = Math.ceil(
        (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 最小7日、最大30日の範囲で調整
      const fetchDays = Math.min(Math.max(daysSinceLastSync, MIN_FETCH_DAYS), MAX_FETCH_DAYS);
      const startTime = getDateDaysAgo(fetchDays);

      return { startTime, endTime };
    } else {
      // 初回同期（LastSyncTimeなし）
      const days = await this.configService.loadExportPeriodDays();
      const startTime = getDateDaysAgo(days);
      return { startTime, endTime };
    }
  }
}

/**
 * 同期サービスのシングルトンインスタンス
 */
export const SyncService = new SyncServiceImpl(
  new AccessChecker(),
  new Fetcher(),
  new Filter(),
  queueManager,
  exportConfigService
);
