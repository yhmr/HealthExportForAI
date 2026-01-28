import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as exportService from '../../src/services/export/service';
import * as healthConnect from '../../src/services/healthConnect';
import { SyncServiceImpl } from '../../src/services/syncService';
import { HealthData } from '../../src/types/health';

// 外部依存のモック（Factory関数を使用）
vi.mock('../../src/services/healthConnect', () => ({
  fetchAllHealthData: vi.fn(),
  checkHealthConnectAvailability: vi.fn(),
  checkHealthPermissions: vi.fn(),
  initializeHealthConnect: vi.fn()
}));

vi.mock('../../src/services/export/service', () => ({
  addToExportQueue: vi.fn(),
  processExportQueue: vi.fn()
}));

vi.mock('../../src/utils/dataHelpers', () => ({
  filterHealthDataByTags: vi.fn((data) => data)
}));

describe('SyncServiceImpl', () => {
  let syncService: SyncServiceImpl;
  let mockConfigService: any; // 型はanyで回避

  beforeEach(() => {
    vi.clearAllMocks();

    // ExportConfigServiceのモック作成
    mockConfigService = {
      saveIsSetupCompleted: vi.fn(),
      loadIsSetupCompleted: vi.fn(),
      loadLastSyncTime: vi.fn(),
      saveLastSyncTime: vi.fn(),
      loadExportPeriodDays: vi.fn().mockResolvedValue(7),
      saveExportPeriodDays: vi.fn(),
      saveExportFormats: vi.fn(),
      loadExportFormats: vi.fn(),
      saveExportSheetAsPdf: vi.fn(),
      loadExportSheetAsPdf: vi.fn(),
      saveSelectedDataTags: vi.fn(),
      loadSelectedDataTags: vi.fn(),
      removeLastSyncTime: vi.fn()
    };

    // モックオブジェクトを注入してインスタンス化
    syncService = new SyncServiceImpl(mockConfigService);

    // デフォルトのモック動作設定
    (healthConnect.fetchAllHealthData as any).mockResolvedValue({} as HealthData);
    (exportService.addToExportQueue as any).mockResolvedValue(true);
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
      (healthConnect.fetchAllHealthData as any).mockResolvedValue(mockData);
      (mockConfigService.loadLastSyncTime as any).mockResolvedValue('2023-01-01T00:00:00.000Z');

      await syncService.fetchAndQueueNewData(undefined, false, undefined);

      // 成功時にLastSyncTimeが保存されるか検証
      expect(mockConfigService.saveLastSyncTime).toHaveBeenCalled();
      expect(exportService.addToExportQueue).toHaveBeenCalled();
    });

    it('should not save LastSyncTime if no data found', async () => {
      // データがない場合のモック
      (healthConnect.fetchAllHealthData as any).mockResolvedValue({});

      await syncService.fetchAndQueueNewData(undefined, false, undefined);

      // データなしなのでLastSyncTimeは更新されないはず
      expect(mockConfigService.saveLastSyncTime).not.toHaveBeenCalled();
    });
  });
});
