import { AppError } from '../types/errors';
import { HealthData } from '../types/health';
import { err, ok, Result } from '../types/result';
import { generateDateRange, getCurrentISOString, getDateDaysAgo } from '../utils/formatters';
import { ExportConfigService, exportConfigService } from './config/ExportConfigService';
import { addDebugLog } from './debugLogService';
import { queueManager, QueueManager } from './export/QueueManager';
import {
  createDefaultExportConfig,
  processExportQueue,
  ProcessQueueResult
} from './export/service';
import { AccessChecker } from './health/AccessChecker';
import { Fetcher } from './health/Fetcher';
import { Filter } from './health/Filter';

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
  async initialize(): Promise<
    Result<
      {
        available: boolean;
        initialized: boolean;
        hasPermissions: boolean;
      },
      AppError
    >
  > {
    const availabilityResult = await this.accessChecker.checkAvailability();
    if (!availabilityResult.isOk()) {
      await addDebugLog(
        `[SyncService] Availability check failed: ${availabilityResult.unwrapErr()}`,
        'error'
      );

      return err(availabilityResult.unwrapErr());
    }
    const availability = availabilityResult.unwrap();

    if (!availability.available) {
      return ok({ available: false, initialized: false, hasPermissions: false });
    }

    const initResult = await this.accessChecker.initialize();
    if (!initResult.isOk()) {
      await addDebugLog(
        `[SyncService] Initialization check failed: ${initResult.unwrapErr()}`,
        'error'
      );
      // 初期化チェックが失敗した場合のエラー処理
      return err(initResult.unwrapErr());
    }
    const initialized = initResult.unwrap();

    if (!initialized) {
      return ok({ available: true, initialized: false, hasPermissions: false });
    }

    const permResult = await this.accessChecker.hasPermissions();
    if (!permResult.isOk()) {
      await addDebugLog(
        `[SyncService] Permission check failed: ${permResult.unwrapErr()}`,
        'error'
      );
      return err(permResult.unwrapErr());
    }
    const hasPermissions = permResult.unwrap();

    return ok({ available: true, initialized: true, hasPermissions });
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
  ): Promise<Result<SyncResult, AppError>> {
    try {
      await addDebugLog('[SyncService] Starting sync...', 'info');

      // 1. 取得期間の決定
      const fetchTimeRange = await this.calculateFetchTimeRange(periodDays, forceFullSync);
      const { startTime, endTime } = fetchTimeRange;

      await addDebugLog(
        `[SyncService] Fetching data from ${startTime.toISOString()} to ${endTime.toISOString()}`,
        'info'
      );

      // 権限チェックを追加し、バックグラウンドでのSecurityExceptionを回避
      const permResult = await this.accessChecker.hasPermissions();
      if (!permResult.unwrapOr(false)) {
        await addDebugLog('[SyncService] Permissions missing, aborting sync', 'warn');
        return err(new AppError('Permissions missing', 'PERMISSION_DENIED'));
      }

      // 2. データの取得 (Fetcher利用)
      const healthData = await this.fetcher.fetchAllData(startTime, endTime);

      const hasData = Object.values(healthData).some((arr) => Array.isArray(arr) && arr.length > 0);
      const dateRange = generateDateRange(startTime, endTime);
      let queued = false;

      if (hasData) {
        const now = getCurrentISOString();
        await this.configService.saveLastSyncTime(now);
        await addDebugLog(`[SyncService] Sync success. LastSyncTime updated: ${now}`, 'success');

        let dataToQueue = healthData;
        if (selectedTags && selectedTags.length > 0) {
          dataToQueue = this.filter.filterByTags(healthData, selectedTags);
        }

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

      return ok({
        success: true,
        data: healthData,
        dateRange,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        isNewData: hasData,
        queued
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await addDebugLog(`[SyncService] Sync failed: ${errorMessage}`, 'error');
      // AppErrorとして返す
      return err(new AppError(`Sync failed: ${errorMessage}`, 'SYNC_FAILED', error));
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
  ): Promise<
    Result<{ syncResult: SyncResult; exportResult?: ProcessQueueResult | null }, AppError>
  > {
    // 1. データ取得 & キューイング
    const syncResultOrErr = await this.fetchAndQueueNewData(
      periodDays,
      forceFullSync,
      selectedTags
    );

    if (!syncResultOrErr.isOk()) {
      return err(syncResultOrErr.unwrapErr());
    }
    const syncResult = syncResultOrErr.unwrap();

    let exportResult = null;

    // 2. 取得に成功し、かつ新しいデータがキューに追加された場合、またはキューに未処理が残っている場合
    if (syncResult.success) {
      // 取得に成功し、かつ新しいデータがキューに追加された場合、またはキューに未処理が残っている場合
      // オフライン判定等は processExportQueue 側で行われるため、ここでは単に呼び出す
      exportResult = await processExportQueue();
    }

    return ok({
      syncResult,
      exportResult
    });
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
