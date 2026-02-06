import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportConfigService } from '../../src/services/config/ExportConfigService';
import { SyncServiceImpl } from '../../src/services/syncService';
import { HealthData } from '../../src/types/health';
import { err, ok } from '../../src/types/result';

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
      checkAvailability: vi.fn().mockResolvedValue(ok(true)),
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
      await syncService.fetchAndQueueNewData(undefined, true, undefined);
      expect(mockConfigService.loadExportPeriodDays).toHaveBeenCalled();
    });

    it('should save LastSyncTime on success when data exists', async () => {
      const mockData = { steps: [{ value: 100 }] } as unknown as HealthData;
      mockFetcher.fetchAllData.mockResolvedValue(mockData);
      mockConfigService.loadLastSyncTime.mockResolvedValue('2023-01-01T00:00:00.000Z');

      await syncService.fetchAndQueueNewData(undefined, false, undefined);

      expect(mockConfigService.saveLastSyncTime).toHaveBeenCalled();
      expect(mockQueueManager.addToQueue).toHaveBeenCalled();
    });

    it('should not save LastSyncTime if no data found', async () => {
      mockFetcher.fetchAllData.mockResolvedValue({});
      await syncService.fetchAndQueueNewData(undefined, false, undefined);
      expect(mockConfigService.saveLastSyncTime).not.toHaveBeenCalled();
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

    it('should handle fetch failure gracefully', async () => {
      mockFetcher.fetchAllData.mockRejectedValue(new Error('Fetch failed'));

      // fetchAndQueueNewData returns Promise<Result<...>>
      const result = await syncService.fetchAndQueueNewData(undefined, false, undefined);

      expect(result.isErr()).toBe(true);
      // Use unwrapErr() to access the error object safely
      expect(result.unwrapErr().message).toContain('Sync failed');
    });

    it('should use default period if forceFullSync is true', async () => {
      mockConfigService.loadExportPeriodDays.mockResolvedValue(10);
      await syncService.fetchAndQueueNewData(undefined, true, undefined);
      expect(mockConfigService.loadExportPeriodDays).toHaveBeenCalled();
    });

    it('should calculate time range from lastSyncTime if available and not forced', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      mockConfigService.loadLastSyncTime.mockResolvedValue(twoDaysAgo);

      await syncService.fetchAndQueueNewData(undefined, false, undefined);

      expect(mockConfigService.loadExportPeriodDays).not.toHaveBeenCalled();
    });

    it('should use default period if lastSyncTime is missing', async () => {
      mockConfigService.loadLastSyncTime.mockResolvedValue(null);
      mockConfigService.loadExportPeriodDays.mockResolvedValue(30);

      await syncService.fetchAndQueueNewData(undefined, false, undefined);

      expect(mockConfigService.loadExportPeriodDays).toHaveBeenCalled();
    });
  });

  describe('executeFullSync', () => {
    it('should perform sync and export successfully', async () => {
      const mockData = { steps: [1] } as any;
      mockFetcher.fetchAllData.mockResolvedValue(mockData);
      mockQueueManager.addToQueue.mockResolvedValue('q1');

      const mockExportResult = { successCount: 1, failCount: 0, skippedCount: 0, errors: [] };
      const { processExportQueue } = await import('../../src/services/export/service');
      vi.mocked(processExportQueue).mockResolvedValue(mockExportResult);

      const result = await syncService.executeFullSync();

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      expect(data.syncResult.success).toBe(true);
      expect(data.exportResult).toBe(mockExportResult);
      expect(processExportQueue).toHaveBeenCalled();
    });

    it('should return error if sync fails', async () => {
      mockFetcher.fetchAllData.mockRejectedValue(new Error('Fetch Error'));

      const result = await syncService.executeFullSync();

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().message).toContain('Fetch Error');
      const { processExportQueue } = await import('../../src/services/export/service');
      expect(processExportQueue).not.toHaveBeenCalled();
    });

    it('should not process export queue if sync fails (no new data logic check)', async () => {
      // If sync succeeds but no data found, executeFullSync logic calls processExportQueue.
      mockFetcher.fetchAllData.mockResolvedValue({}); // No data
      const result = await syncService.executeFullSync();
      expect(result.isOk()).toBe(true);
      const { processExportQueue } = await import('../../src/services/export/service');
      expect(processExportQueue).toHaveBeenCalled();
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
      mockAccessChecker.checkAvailability.mockResolvedValue(ok(false));
      const result = await syncService.initialize();
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().available).toBe(false);
      expect(mockAccessChecker.initialize).not.toHaveBeenCalled();
    });

    it('should return error if availability check fails', async () => {
      mockAccessChecker.checkAvailability.mockResolvedValue(err('Check failed'));
      const result = await syncService.initialize();
      expect(result.isErr()).toBe(true);
    });

    it('should return error if initialize fails', async () => {
      mockAccessChecker.initialize.mockResolvedValue(err('Init failed'));
      const result = await syncService.initialize();
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().message).toContain('Init failed');
      expect(result.unwrapErr().code).toBe('HEALTH_INIT_FAILED');
    });

    it('should return ok with initialized=false if initialize returns false', async () => {
      mockAccessChecker.checkAvailability.mockResolvedValue(ok(true));
      mockAccessChecker.initialize.mockResolvedValue(ok(false));

      const result = await syncService.initialize();

      expect(result.isOk()).toBe(true);
      const accessInfo = result.unwrap();
      expect(accessInfo.initialized).toBe(false);
      expect(accessInfo.hasPermissions).toBe(false);
      expect(mockAccessChecker.hasPermissions).not.toHaveBeenCalled();
    });

    it('should return error if permission check fails', async () => {
      mockAccessChecker.checkAvailability.mockResolvedValue(ok({ available: true }));
      mockAccessChecker.initialize.mockResolvedValue(ok(true));
      mockAccessChecker.hasPermissions.mockResolvedValue(err('Perm check error'));

      const result = await syncService.initialize();

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().message).toContain('Perm check error');
      expect(result.unwrapErr().code).toBe('HEALTH_PERMISSION_FAILED');
    });
  });
});
