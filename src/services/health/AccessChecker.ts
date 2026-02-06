import { Result } from '../../types/result';
import { HealthServiceError, healthService } from './HealthServiceAdapter';

/**
 * Health SDKの権限と利用可能性を管理するクラス
 * Platform依存の処理はHealthServiceAdapterに委譲
 */
export class AccessChecker {
  /**
   * Health SDKが利用可能かチェック
   */
  async checkAvailability(): Promise<Result<boolean, HealthServiceError>> {
    return healthService.checkAvailability();
  }

  /**
   * Health SDKを初期化
   */
  async initialize(): Promise<Result<boolean, HealthServiceError>> {
    return healthService.initialize();
  }

  /**
   * 必要な権限が付与されているかチェック
   * Adapterに委譲し、プラットフォーム固有の権限チェックを実行
   */
  async hasPermissions(): Promise<Result<boolean, HealthServiceError>> {
    return healthService.hasPermissions();
  }

  /**
   * 権限をリクエスト
   */
  async requestPermissions(): Promise<Result<boolean, HealthServiceError>> {
    return healthService.requestPermissions();
  }

  /**
   * バックグラウンド読み取り権限をリクエスト (Android 14+)
   */
  async requestBackgroundPermission(): Promise<Result<boolean, HealthServiceError>> {
    return healthService.requestBackgroundPermission();
  }
}
