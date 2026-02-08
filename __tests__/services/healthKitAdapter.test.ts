import * as ReactNative from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '../../src/types/result';

const { checkHealthKitAvailabilityMock, probeHealthKitReadPermissionMock } = vi.hoisted(() => ({
  checkHealthKitAvailabilityMock: vi.fn(),
  probeHealthKitReadPermissionMock: vi.fn()
}));

vi.mock('../../src/services/health/healthKit', () => ({
  checkHealthKitAvailability: checkHealthKitAvailabilityMock,
  probeHealthKitReadPermission: probeHealthKitReadPermissionMock,
  initializeHealthKit: vi.fn(),
  fetchStepsData: vi.fn(),
  fetchWeightData: vi.fn(),
  fetchBodyFatData: vi.fn(),
  fetchTotalCaloriesData: vi.fn(),
  fetchBasalMetabolicRateData: vi.fn(),
  fetchSleepData: vi.fn(),
  fetchExerciseData: vi.fn(),
  fetchNutritionData: vi.fn()
}));

vi.mock('../../src/services/debugLogService', () => ({
  addDebugLog: vi.fn().mockResolvedValue(undefined)
}));

async function createAdapter() {
  const { HealthKitAdapter } = await import('../../src/services/health/HealthKitAdapter');
  return new HealthKitAdapter();
}

describe('HealthKitAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ReactNative.Linking, 'canOpenURL').mockResolvedValue(false);
    vi.spyOn(ReactNative.Linking, 'openURL').mockResolvedValue(undefined);
    vi.spyOn(ReactNative.Linking, 'openSettings').mockResolvedValue(undefined);
    checkHealthKitAvailabilityMock.mockResolvedValue(ok(true));
    probeHealthKitReadPermissionMock.mockResolvedValue(ok(true));
  });

  it('openDataManagement should open Apple Health app when URL scheme is available', async () => {
    vi.spyOn(ReactNative.Linking, 'canOpenURL').mockResolvedValue(true);
    const adapter = await createAdapter();

    await adapter.openDataManagement();

    expect(ReactNative.Linking.canOpenURL).toHaveBeenCalledWith('x-apple-health://');
    expect(ReactNative.Linking.openURL).toHaveBeenCalledWith('x-apple-health://');
    expect(ReactNative.Linking.openSettings).not.toHaveBeenCalled();
  });

  it('openDataManagement should fallback to app settings when Health app URL is unavailable', async () => {
    vi.mocked(ReactNative.Linking.canOpenURL).mockResolvedValue(false);
    const adapter = await createAdapter();

    await adapter.openDataManagement();

    expect(ReactNative.Linking.openURL).not.toHaveBeenCalled();
    expect(ReactNative.Linking.openSettings).toHaveBeenCalled();
  });

  it('hasPermissions should return false when probe indicates permission denied', async () => {
    probeHealthKitReadPermissionMock.mockResolvedValue(err('permission_denied'));
    const adapter = await createAdapter();

    const result = await adapter.hasPermissions();

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(false);
  });

  it('hasPermissions should return true on inconclusive probe errors', async () => {
    probeHealthKitReadPermissionMock.mockResolvedValue(err('fetch_error'));
    const adapter = await createAdapter();

    const result = await adapter.hasPermissions();

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(true);
  });
});
