import AppleHealthKit from 'react-native-health';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchExerciseData,
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
});
