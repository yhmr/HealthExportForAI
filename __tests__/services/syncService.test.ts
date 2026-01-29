import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportConfigService } from '../../src/services/config/ExportConfigService';
import { SyncServiceImpl } from '../../src/services/syncService';
import { HealthData } from '../../src/types/health';
import { ok } from '../../src/types/result';

// 外部モジュールのモック
vi.mock('../../src/services/health/AccessChecker');
vi.mock('../../src/services/health/Fetcher');
vi.mock('../../src/services/health/Filter');
vi.mock('../../src/services/export/QueueManager');
vi.mock('../../src/services/export/service', () => ({
  processExportQueue: vi.fn(),
  createDefaultExportConfig: vi.fn().mockResolvedValue({})
}));
vi.mock('../../src/services/debugLogService', () => ({
  addDebugLog: vi.fn()
}));

describe('SyncServiceImpl', () => {
  let syncService: SyncServiceImpl;
  let mockAccessChecker: any;
  let mockFetcher: any;
  let mockFilter: any;
  let mockQueueManager: any;
  let mockConfigService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // モックオブジェクトの作成
    mockAccessChecker = {
      checkAvailability: vi.fn().mockResolvedValue(ok({ available: true })),
      initialize: vi.fn().mockResolvedValue(ok(true)),
      hasPermissions: vi.fn().mockResolvedValue(ok(true))
    };

    mockFetcher = {
      fetchAllData: vi.fn().mockResolvedValue({})
    };

    mockFilter = {
      filterByTags: vi.fn((data) => data)
    };

    mockQueueManager = {
      addToQueue: vi.fn().mockResolvedValue('queue-id')
    };

    // ExportConfigServiceのモック (Interface like object)
    mockConfigService = {
      saveIsSetupCompleted: vi.fn(),
      loadIsSetupCompleted: vi.fn(),
      loadLastSyncTime: vi.fn().mockResolvedValue(null),
      saveLastSyncTime: vi.fn(),
      loadExportPeriodDays: vi.fn().mockResolvedValue(7),
      saveExportPeriodDays: vi.fn()
      // ...他のメソッドは必要に応じて追加
    } as unknown as ExportConfigService;

    // SyncServiceのインスタンス化
    syncService = new SyncServiceImpl(
      mockAccessChecker,
      mockFetcher,
      mockFilter,
      mockQueueManager,
      mockConfigService
    );
  });

  describe('fetchAndQueueNewData', () => {
    it('should use ExportConfigService to load configuration', async () => {
      // 期間指定なしで実行
      await syncService.fetchAndQueueNewData(undefined, true, undefined);

      // ConfigServiceが呼ばれたか検証
      expect(mockConfigService.loadExportPeriodDays).toHaveBeenCalled();
    });

    it('should save LastSyncTime on success when data exists', async () => {
      // データが存在する場合のモック
      const mockData = { steps: [{ value: 100 }] } as unknown as HealthData;
      mockFetcher.fetchAllData.mockResolvedValue(mockData);
      mockConfigService.loadLastSyncTime.mockResolvedValue('2023-01-01T00:00:00.000Z');

      await syncService.fetchAndQueueNewData(undefined, false, undefined);

      // 成功時にLastSyncTimeが保存されるか検証
      expect(mockConfigService.saveLastSyncTime).toHaveBeenCalled();
      // QueueManagerに追加されるか
      expect(mockQueueManager.addToQueue).toHaveBeenCalled();
    });

    it('should not save LastSyncTime if no data found', async () => {
      // データがない場合のモック
      mockFetcher.fetchAllData.mockResolvedValue({});

      await syncService.fetchAndQueueNewData(undefined, false, undefined);

      // データなしなのでLastSyncTimeは更新されないはず
      expect(mockConfigService.saveLastSyncTime).not.toHaveBeenCalled();
      // Queueに追加されない
      expect(mockQueueManager.addToQueue).not.toHaveBeenCalled();
    });

    it('should filter data if selectedTags provided', async () => {
      const mockData = { steps: [1], weight: [2] } as any;
      mockFetcher.fetchAllData.mockResolvedValue(mockData);
      mockConfigService.loadLastSyncTime.mockResolvedValue('2023-01-01');

      await syncService.fetchAndQueueNewData(undefined, false, ['steps']);

      expect(mockFilter.filterByTags).toHaveBeenCalledWith(mockData, ['steps']);
      expect(mockQueueManager.addToQueue).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('should check availability and permissions', async () => {
      await syncService.initialize();

      expect(mockAccessChecker.checkAvailability).toHaveBeenCalled();
      expect(mockAccessChecker.initialize).toHaveBeenCalled();
      expect(mockAccessChecker.hasPermissions).toHaveBeenCalled();
    });

    it('should return false if not available', async () => {
      mockAccessChecker.checkAvailability.mockResolvedValue(ok({ available: false }));

      const result = await syncService.initialize();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().available).toBe(false);
      expect(mockAccessChecker.initialize).not.toHaveBeenCalled();
    });
  });
});
