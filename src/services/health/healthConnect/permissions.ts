import { PermissionsAndroid, Platform } from 'react-native';
import {
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  requestPermission,
  SdkAvailabilityStatus
} from 'react-native-health-connect';
import { HealthConnectError } from '../../../types/errors';
import { err, ok, type Result } from '../../../types/result';
import { addDebugLog } from '../../debugLogService';
import { REQUIRED_PERMISSIONS } from './constants';

// SDK初期化の薄いラッパー。Result型に揃えて上位の分岐を単純化する。
export async function initializeHealthConnect(): Promise<Result<boolean, HealthConnectError>> {
  try {
    const isInitialized = await initialize();
    return ok(isInitialized);
  } catch (error) {
    const msg = `Init Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'INIT_FAILED', error));
  }
}

export async function checkHealthConnectAvailability(): Promise<
  Result<{ available: boolean; status: number }, HealthConnectError>
> {
  try {
    const status = await getSdkStatus();
    return ok({
      available: status === SdkAvailabilityStatus.SDK_AVAILABLE,
      status
    });
  } catch (error) {
    return err(
      new HealthConnectError(
        `Availability Check Error: ${error}`,
        'CHECK_AVAILABILITY_FAILED',
        error
      )
    );
  }
}

export async function checkHealthPermissions(): Promise<Result<boolean, HealthConnectError>> {
  try {
    const grantedPermissions = await getGrantedPermissions();

    // 要求一覧と付与一覧を突き合わせて「全部揃っているか」を判定する。
    const allGranted = REQUIRED_PERMISSIONS.every((required) =>
      grantedPermissions.some(
        (granted) =>
          granted.accessType === required.accessType && granted.recordType === required.recordType
      )
    );

    return ok(allGranted);
  } catch (error) {
    const msg = `Check Permission Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'CHECK_PERMISSIONS_FAILED', error));
  }
}

export async function requestHealthPermissions(): Promise<Result<boolean, HealthConnectError>> {
  try {
    const grantedPermissions = await requestPermission(REQUIRED_PERMISSIONS);

    const allGranted = REQUIRED_PERMISSIONS.every((required) =>
      grantedPermissions.some(
        (granted) =>
          granted.accessType === required.accessType && granted.recordType === required.recordType
      )
    );

    if (!allGranted) {
      // どれが不足しているかをログに残し、設定案内しやすくする。
      const missingPermissions = REQUIRED_PERMISSIONS.filter(
        (required) =>
          !grantedPermissions.some(
            (granted) =>
              granted.accessType === required.accessType &&
              granted.recordType === required.recordType
          )
      );
      await addDebugLog(
        `[HealthConnect] Permissions missing: ${JSON.stringify(missingPermissions)}`,
        'warn'
      );
      return ok(false);
    }

    return ok(true);
  } catch (error) {
    const msg = `Permission Request Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'REQUEST_PERMISSIONS_FAILED', error));
  }
}

export async function requestBackgroundHealthPermission(): Promise<
  Result<boolean, HealthConnectError>
> {
  try {
    // Android 14+ のみ追加権限が必要。その他環境は常に true 扱い。
    if (Platform.OS === 'android' && Platform.Version >= 34) {
      const backgroundPermission = 'android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND';
      const hasBackgroundPermission = await PermissionsAndroid.check(backgroundPermission as any);

      if (!hasBackgroundPermission) {
        await addDebugLog('[HealthConnect] Requesting background permission', 'info');
        const granted = await PermissionsAndroid.request(backgroundPermission as any);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          await addDebugLog('[HealthConnect] Background permission denied', 'warn');
          return ok(false);
        }

        await addDebugLog('[HealthConnect] Background permission granted', 'success');
      }
    }

    return ok(true);
  } catch (error) {
    const msg = `Background Permission Request Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'REQUEST_BG_PERMISSION_FAILED', error));
  }
}

export function openHealthConnectDataManagement(): void {
  openHealthConnectSettings();
}
