import AppleHealthKit from 'react-native-health';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enableBackgroundDelivery,
  fetchExerciseData,
  fetchNutritionData,
  probeHealthKitReadPermission
} from '../../src/services/health/healthKit';

vi.mock('../../src/services/debugLogService', () => ({
  addDebugLog: vi.fn().mockResolvedValue(undefined)
}));

describe('healthKit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchExerciseData should parse workout records that have start/end fields', async () => {
    const getSamplesMock = vi.spyOn(AppleHealthKit, 'getSamples').mockImplementation((_o, cb) => {
      cb(
        null as any,
        [
          {
            start: '2026-02-01T10:00:00.000Z',
            end: '2026-02-01T11:30:00.000Z',
            activityName: 'HKWorkoutActivityTypeRunning'
          }
        ] as any[]
      );
    });

    const result = await fetchExerciseData(new Date('2026-02-01T00:00:00.000Z'), new Date());

    expect(getSamplesMock).toHaveBeenCalled();
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual([
      {
        date: '2026-02-01',
        type: 'running',
        durationMinutes: 90
      }
    ]);
  });

  it('probeHealthKitReadPermission should return permission_denied for authorization-like errors', async () => {
    const getDailyStepsMock = vi
      .spyOn(AppleHealthKit, 'getDailyStepCountSamples')
      .mockImplementation((_o, cb) => {
        cb('Authorization denied', []);
      });

    const result = await probeHealthKitReadPermission();

    expect(getDailyStepsMock).toHaveBeenCalled();
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe('permission_denied');
  });

  it('probeHealthKitReadPermission should return true when probe succeeds', async () => {
    vi.spyOn(AppleHealthKit, 'getDailyStepCountSamples').mockImplementation((_o, cb) => {
      cb(null as any, [
        // no-op: 権限判定用なのでデータ件数は問わない
      ]);
    });

    const result = await probeHealthKitReadPermission();

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(true);
  });

  it('enableBackgroundDelivery should succeed without native background API calls', async () => {
    const result = await enableBackgroundDelivery();

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(true);
  });

  it('fetchNutritionData should aggregate daily nutrition metrics from multiple queries', async () => {
    vi.spyOn(AppleHealthKit, 'getEnergyConsumedSamples').mockImplementation((_o, cb) => {
      cb(null as any, [{ startDate: '2026-02-01T08:00:00.000Z', value: 650 } as any]);
    });
    vi.spyOn(AppleHealthKit, 'getProteinSamples').mockImplementation((_o, cb) => {
      cb(null as any, [{ startDate: '2026-02-01T08:00:00.000Z', value: 40 } as any]);
    });
    vi.spyOn(AppleHealthKit, 'getTotalFatSamples').mockImplementation((_o, cb) => {
      cb(null as any, [{ startDate: '2026-02-01T08:00:00.000Z', value: 18 } as any]);
    });
    vi.spyOn(AppleHealthKit, 'getCarbohydratesSamples').mockImplementation((_o, cb) => {
      cb(null as any, [{ startDate: '2026-02-01T08:00:00.000Z', value: 75 } as any]);
    });
    vi.spyOn(AppleHealthKit, 'getFiberSamples').mockImplementation((_o, cb) => {
      cb(null as any, [{ startDate: '2026-02-01T08:00:00.000Z', value: 9 } as any]);
    });
    vi.spyOn(AppleHealthKit, 'getSamples').mockImplementation((_o, cb) => {
      cb(null as any, [{ start: '2026-02-01T08:00:00.000Z', quantity: 6 } as any]);
    });

    const result = await fetchNutritionData(
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-02T00:00:00.000Z')
    );

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual([
      {
        date: '2026-02-01',
        calories: 650,
        protein: 40,
        totalFat: 18,
        totalCarbohydrate: 75,
        dietaryFiber: 9,
        saturatedFat: 6
      }
    ]);
  });

  it('fetchNutritionData should return fetch_error when all nutrition queries fail', async () => {
    vi.spyOn(AppleHealthKit, 'getEnergyConsumedSamples').mockImplementation((_o, cb) => {
      cb('permission denied', [] as any);
    });
    vi.spyOn(AppleHealthKit, 'getProteinSamples').mockImplementation((_o, cb) => {
      cb('permission denied', [] as any);
    });
    vi.spyOn(AppleHealthKit, 'getTotalFatSamples').mockImplementation((_o, cb) => {
      cb('permission denied', [] as any);
    });
    vi.spyOn(AppleHealthKit, 'getCarbohydratesSamples').mockImplementation((_o, cb) => {
      cb('permission denied', [] as any);
    });
    vi.spyOn(AppleHealthKit, 'getFiberSamples').mockImplementation((_o, cb) => {
      cb('permission denied', [] as any);
    });
    vi.spyOn(AppleHealthKit, 'getSamples').mockImplementation((_o, cb) => {
      cb('permission denied', [] as any);
    });

    const result = await fetchNutritionData(
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-02T00:00:00.000Z')
    );

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe('fetch_error');
  });
});
