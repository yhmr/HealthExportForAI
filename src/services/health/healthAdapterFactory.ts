// ヘルスアダプターファクトリ
// Platform.OSに基づいてHealthConnectAdapter/HealthKitAdapterを生成

import { Platform } from 'react-native';
import { HealthConnectAdapter } from './HealthConnectAdapter';
import { HealthKitAdapter } from './HealthKitAdapter';
import { IHealthService } from './types';

/**
 * ヘルスアダプターファクトリのインターフェース
 */
export interface HealthAdapterFactory {
  createHealthService(): IHealthService;
}

/**
 * デフォルトのヘルスアダプターファクトリ実装
 * Platform.OSに基づいて適切なアダプターを生成
 */
class DefaultHealthAdapterFactory implements HealthAdapterFactory {
  createHealthService(): IHealthService {
    if (Platform.OS === 'android') {
      return new HealthConnectAdapter();
    } else if (Platform.OS === 'ios') {
      return new HealthKitAdapter();
    }
    // 未対応プラットフォームの場合（Web等）はエラーをスロー
    throw new Error(`Unsupported platform: ${Platform.OS}`);
  }
}

// ファクトリのシングルトンインスタンス
export const healthAdapterFactory: HealthAdapterFactory = new DefaultHealthAdapterFactory();

// 後方互換性のためのシングルトンサービスインスタンス
// 既存コードで healthService を使用している箇所のためにエクスポート
export const healthService: IHealthService = healthAdapterFactory.createHealthService();

// 型を再エクスポート
export type { HealthServiceError, IHealthService } from './types';
