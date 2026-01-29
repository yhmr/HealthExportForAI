import { HealthConnectError } from '../../types/errors';
import { Result } from '../../types/result';
import {
  checkHealthConnectAvailability,
  checkHealthPermissions,
  initializeHealthConnect,
  requestBackgroundHealthPermission,
  requestHealthPermissions
} from '../healthConnect';

/**
 * Health Connectの権限と利用可能性を管理するクラス
 */
export class AccessChecker {
  /**
   * Health Connect SDKが利用可能かチェック
   */
  async checkAvailability(): Promise<
    Result<{ available: boolean; status: number }, HealthConnectError>
  > {
    return checkHealthConnectAvailability();
  }

  /**
   * Health Connect SDKを初期化
   */
  async initialize(): Promise<Result<boolean, HealthConnectError>> {
    return initializeHealthConnect();
  }

  /**
   * 必要な権限が付与されているかチェック
   */
  async hasPermissions(): Promise<Result<boolean, HealthConnectError>> {
    return checkHealthPermissions();
  }

  /**
   * 権限をリクエスト
   */
  async requestPermissions(): Promise<Result<boolean, HealthConnectError>> {
    return requestHealthPermissions();
  }

  /**
   * バックグラウンド読み取り権限をリクエスト (Android 14+)
   */
  async requestBackgroundPermission(): Promise<Result<boolean, HealthConnectError>> {
    return requestBackgroundHealthPermission();
  }
}
