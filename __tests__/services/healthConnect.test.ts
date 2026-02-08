import * as HealthConnect from 'react-native-health-connect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as DebugLogService from '../../src/services/debugLogService';
import { requestHealthPermissions } from '../../src/services/health/healthConnect';
import { aggregateByLatestPerDay } from '../../src/utils/healthAggregation';

vi.mock('../../src/services/debugLogService', () => ({
  addDebugLog: vi.fn()
}));

describe('Health Connect Service', () => {
  describe('aggregateByLatestPerDay', () => {
    // テスト用のレコード型定義
    interface TestRecord {
      value: number;
      time: string;
    }

    // テスト用の変換後データ型定義
    interface TransformedData {
      date: string;
      value: number;
      time?: string;
    }

    const transform = (record: TestRecord, date: string): TransformedData => ({
      date,
      value: record.value,
      time: record.time
    });

    const getTime = (record: TestRecord) => record.time;

    it('should aggregate records by date, keeping the latest one', () => {
      const records: TestRecord[] = [
        { value: 10, time: '2025-01-01T01:00:00.000Z' }, // 1日目古い (10:00 JST)
        { value: 20, time: '2025-01-01T02:00:00.000Z' }, // 1日目新しい (11:00 JST) -> これが残るべき
        { value: 30, time: '2025-01-02T01:00:00.000Z' } // 2日目 (10:00 JST)
      ];

      const result = aggregateByLatestPerDay(records, getTime, transform);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2025-01-01',
        value: 20,
        time: '2025-01-01T02:00:00.000Z' // 新しい方が残る
      });
      expect(result[1]).toEqual({
        date: '2025-01-02',
        value: 30,
        time: '2025-01-02T01:00:00.000Z'
      });
    });

    it('should sort results by date ascending', () => {
      const records: TestRecord[] = [
        { value: 30, time: '2025-01-03T01:00:00.000Z' },
        { value: 10, time: '2025-01-01T01:00:00.000Z' },
        { value: 20, time: '2025-01-02T01:00:00.000Z' }
      ];

      const result = aggregateByLatestPerDay(records, getTime, transform);

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2025-01-01');
      expect(result[1].date).toBe('2025-01-02');
      expect(result[2].date).toBe('2025-01-03');
    });

    it('should handle empty input gracefully', () => {
      const records: TestRecord[] = [];
      const result = aggregateByLatestPerDay(records, getTime, transform);
      expect(result).toEqual([]);
    });

    it('should handle single day data', () => {
      const records: TestRecord[] = [
        { value: 10, time: '2025-01-01T10:00:00.000Z' },
        { value: 20, time: '2025-01-01T11:00:00.000Z' }, // 中間
        { value: 30, time: '2025-01-01T12:00:00.000Z' } // 最新
      ];

      const result = aggregateByLatestPerDay(records, getTime, transform);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '2025-01-01',
        value: 30,
        time: '2025-01-01T12:00:00.000Z'
      });
    });
    describe('aggregateByLatestPerDay Edge Cases', () => {
      it('should handle records with exactly same timestamp', () => {
        // 全く同じ時刻のレコードが2つある場合
        const records: TestRecord[] = [
          { value: 10, time: '2025-01-01T12:00:00.000Z' },
          { value: 20, time: '2025-01-01T12:00:00.000Z' }
        ];

        const result = aggregateByLatestPerDay(records, getTime, transform);

        expect(result).toHaveLength(1);
        // 実装上、後勝ち（または処理順）になるが、少なくともエラーにはならず1つになること
        // 現在の実装 `new Date(time) > ...` だと、同じ時刻の場合は更新されないので、最初のレコードが残るはず
        expect(result[0].value).toBe(10);
      });

      it('should handle date boundaries correctly (UTC/JST)', () => {
        const records: TestRecord[] = [
          { value: 1, time: '2025-01-01T23:59:59.000+09:00' }, // 1/1 終わり
          { value: 2, time: '2025-01-02T00:00:00.000+09:00' } // 1/2 始まり
        ];

        // Note: テスト環境のタイムゾーンに依存する可能性があるが、
        // aggregateByLatestPerDay内で使用する formatDate はローカルタイムを使う。
        // ここでは、ISO文字列として渡すため、環境がJSTであれば別日として扱われることを期待したいが、
        // Node.js/Vitest環境がUTCの場合、+09:00オフセット付きでもUTCに変換されて処理される可能性がある。
        // 現在の formatDate 実装は `new Date(iso).getFullYear()` なので、環境のTZを使用する。

        const result = aggregateByLatestPerDay(records, getTime, transform);

        // 環境に依存せず結果が一貫性を保つか（あるいは別日として認識されるか）確認
        // 異なる日時であれば2件になるはず
        if (result.length === 2) {
          expect(result[0].value).toBe(1);
          expect(result[1].value).toBe(2);
        } else {
          // 同一日とみなされた場合（UTC環境等）は最新の2が残るはず
          expect(result[0].value).toBe(2);
        }
      });
    });
  });

  describe('requestHealthPermissions', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    const REQUIRED_PERMISSIONS = [
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'TotalCaloriesBurned' },
      { accessType: 'read', recordType: 'Weight' },
      { accessType: 'read', recordType: 'BodyFat' },
      { accessType: 'read', recordType: 'BasalMetabolicRate' },
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'ExerciseSession' },
      { accessType: 'read', recordType: 'Nutrition' }
    ] as const;

    it('should return true when all permissions are granted', async () => {
      // 全ての権限付与をシミュレート
      vi.mocked(HealthConnect.requestPermission).mockResolvedValue(REQUIRED_PERMISSIONS as any);

      const result = await requestHealthPermissions();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(true);
      expect(HealthConnect.requestPermission).toHaveBeenCalledWith(REQUIRED_PERMISSIONS);
      expect(DebugLogService.addDebugLog).not.toHaveBeenCalledWith(
        expect.stringContaining('Permissions missing'),
        'error'
      );
    });

    it('should return false when some permissions are missing', async () => {
      // Stepsのみ欠けている状態をシミュレート
      const grantedPermissions = REQUIRED_PERMISSIONS.slice(1);
      vi.mocked(HealthConnect.requestPermission).mockResolvedValue(grantedPermissions as any);

      const result = await requestHealthPermissions();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(false);
      expect(DebugLogService.addDebugLog).toHaveBeenCalledWith(
        expect.stringContaining('[HealthConnect] Permissions missing'),
        'warn'
      );
    });

    it('should return false when no permissions are granted', async () => {
      vi.mocked(HealthConnect.requestPermission).mockResolvedValue([]);

      const result = await requestHealthPermissions();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(false);
    });

    it('should return false and log error when requestPermission throws', async () => {
      vi.mocked(HealthConnect.requestPermission).mockRejectedValue(new Error('Test Error'));

      const result = await requestHealthPermissions();

      expect(result.isErr()).toBe(true);
      expect(DebugLogService.addDebugLog).toHaveBeenCalledWith(
        expect.stringContaining('Permission Request Error'),
        'error'
      );
    });
  });
});
