import AppleHealthKit, { type HealthKitPermissions } from 'react-native-health';
import { err, ok, type Result } from '../../../types/result';
import { addDebugLog } from '../../debugLogService';
import { type HealthServiceError } from '../types';
import { type HealthKitError } from './types';

// アプリが読み取る対象の最小セット。
// ここを追加/削除すると、初回許可ダイアログの項目も変わる。
const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.BodyFatPercentage,
      AppleHealthKit.Constants.Permissions.BasalEnergyBurned,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.EnergyConsumed,
      AppleHealthKit.Constants.Permissions.Protein,
      AppleHealthKit.Constants.Permissions.FatTotal,
      AppleHealthKit.Constants.Permissions.Carbohydrates,
      AppleHealthKit.Constants.Permissions.Fiber,
      AppleHealthKit.Constants.Permissions.FatSaturated
    ],
    write: []
  }
};

const PERMISSION_ERROR_PATTERNS = [
  'authorization',
  'not authorized',
  'permission',
  'denied',
  'not permitted'
];

const BACKGROUND_DELIVERY_FREQUENCY = 'hourly';

// react-native-healthの型に enableBackgroundDelivery が載っていないため補助型を定義。
interface HealthKitWithBackgroundDelivery {
  enableBackgroundDelivery: (
    options: { type: string; frequency: string },
    callback: (error: string) => void
  ) => void;
}

function isLikelyPermissionError(error: unknown): boolean {
  const message = String(error).toLowerCase();
  return PERMISSION_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

export const initializeHealthKit = async (): Promise<Result<boolean, HealthKitError>> => {
  try {
    const isAvailable = await new Promise<boolean>((resolve, reject) => {
      AppleHealthKit.isAvailable((availabilityError: object, available: boolean) => {
        if (availabilityError) {
          reject(availabilityError);
          return;
        }
        resolve(available);
      });
    });

    if (!isAvailable) {
      await addDebugLog('[HealthKit] HealthKit is not available on this device', 'error');
      return err('not_available');
    }

    await new Promise<void>((resolve, reject) => {
      AppleHealthKit.initHealthKit(permissions, (initError: string) => {
        if (initError) {
          reject(new Error(initError));
          return;
        }
        resolve();
      });
    });

    await addDebugLog('[HealthKit] Initialization successful', 'info');
    return ok(true);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await addDebugLog(`[HealthKit] Initialization failed: ${errorMsg}`, 'error');
    return err('init_failed');
  }
};

export const enableBackgroundDelivery = async (): Promise<Result<boolean, HealthServiceError>> => {
  try {
    const read = permissions.permissions.read;
    if (read.length === 0) {
      return ok(false);
    }

    const healthKit = AppleHealthKit as unknown as HealthKitWithBackgroundDelivery;

    // 取得対象に対して個別に配信登録する。
    // 失敗があっても他の型の登録を継続するため、ここでは警告ログのみ残す。
    for (const permission of read) {
      healthKit.enableBackgroundDelivery(
        {
          type: permission,
          frequency: BACKGROUND_DELIVERY_FREQUENCY
        },
        (deliveryError: string) => {
          if (deliveryError) {
            void addDebugLog(
              `[HealthKit] Failed to enable background delivery for ${permission}: ${deliveryError}`,
              'warn'
            );
          }
        }
      );
    }

    await addDebugLog('[HealthKit] Background delivery enabled', 'info');
    return ok(true);
  } catch (error) {
    await addDebugLog(`[HealthKit] Background delivery setup error: ${error}`, 'warn');
    return err('not_available');
  }
};

export const checkHealthKitAvailability = async (): Promise<Result<boolean, HealthKitError>> => {
  return new Promise((resolve) => {
    AppleHealthKit.isAvailable((availabilityError: object, available: boolean) => {
      if (availabilityError) {
        resolve(err('not_available'));
        return;
      }
      resolve(ok(available));
    });
  });
};

export const probeHealthKitReadPermission = async (): Promise<Result<boolean, HealthKitError>> => {
  const endTime = new Date();
  const startTime = new Date(endTime);
  startTime.setDate(startTime.getDate() - 1);

  const options = {
    startDate: startTime.toISOString(),
    endDate: endTime.toISOString(),
    includeManuallyAdded: true
  };

  return new Promise((resolve) => {
    AppleHealthKit.getDailyStepCountSamples(options, (error: unknown) => {
      // iOSはread権限の厳密判定APIが弱いため、軽量読み取りの成否で推定する。
      if (!error) {
        resolve(ok(true));
        return;
      }

      if (isLikelyPermissionError(error)) {
        resolve(err('permission_denied'));
        return;
      }

      void addDebugLog(`[HealthKit] Permission probe failed: ${String(error)}`, 'warn');
      resolve(err('fetch_error'));
    });
  });
};
