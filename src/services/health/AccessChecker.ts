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
  async checkAvailability(): Promise<{ available: boolean; status: number }> {
    return checkHealthConnectAvailability();
  }

  /**
   * Health Connect SDKを初期化
   */
  async initialize(): Promise<boolean> {
    return initializeHealthConnect();
  }

  /**
   * 必要な権限が付与されているかチェック
   */
  async hasPermissions(): Promise<boolean> {
    return checkHealthPermissions();
  }

  /**
   * 権限をリクエスト
   */
  async requestPermissions(): Promise<boolean> {
    return requestHealthPermissions();
  }

  /**
   * バックグラウンド読み取り権限をリクエスト (Android 14+)
   */
  async requestBackgroundPermission(): Promise<boolean> {
    return requestBackgroundHealthPermission();
  }
}
