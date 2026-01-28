// Google Drive設定サービス

import { DriveConfig } from '../../config/driveConfig';
import { AsyncStorageAdapter } from '../infrastructure/AsyncStorageAdapter';
import { DriveConfigService } from './DriveConfigService';

// シングルトンインスタンスの作成
const storageAdapter = new AsyncStorageAdapter();
const driveConfigService = new DriveConfigService(storageAdapter);

/**
 * Drive設定を保存
 */
export function saveDriveConfig(config: DriveConfig): Promise<void> {
  return driveConfigService.saveDriveConfig(config);
}

/**
 * Drive設定を取得
 */
export function loadDriveConfig(): Promise<DriveConfig> {
  return driveConfigService.loadDriveConfig();
}

// DI注入用（SyncService等）にサービスインスタンスをエクスポート
export { driveConfigService };
