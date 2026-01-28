// バックグラウンド同期設定サービス

import { AutoSyncConfig, SyncInterval } from '../../types/exportTypes';
import { AsyncStorageAdapter } from '../infrastructure/AsyncStorageAdapter';
import { BackgroundSyncConfigService } from './BackgroundSyncConfigService';

// シングルトンインスタンスの作成
const storageAdapter = new AsyncStorageAdapter();
const backgroundSyncConfigService = new BackgroundSyncConfigService(storageAdapter);

/**
 * バックグラウンド同期設定を保存
 */
export function saveBackgroundSyncConfig(config: AutoSyncConfig): Promise<void> {
  return backgroundSyncConfigService.saveBackgroundSyncConfig(config);
}

/**
 * バックグラウンド同期設定を取得
 */
export function loadBackgroundSyncConfig(): Promise<AutoSyncConfig> {
  return backgroundSyncConfigService.loadBackgroundSyncConfig();
}

/**
 * 最後のバックグラウンド同期時刻を取得
 * (実質的には統合されたLastSyncTimeを返す)
 */
export function loadLastBackgroundSync(): Promise<string | null> {
  return backgroundSyncConfigService.loadLastBackgroundSync();
}

// テスト用等のためにサービスをエクスポート
export { backgroundSyncConfigService };

/** 利用可能な同期間隔一覧 */
export const SYNC_INTERVALS: SyncInterval[] = [5, 60, 180, 360, 720, 1440, 2880, 4320];

/**
 * 同期間隔のラベルを取得
 */
export function getSyncIntervalLabel(interval: SyncInterval): { ja: string; en: string } {
  const labels: Record<SyncInterval, { ja: string; en: string }> = {
    5: { ja: '5分 (テスト用)', en: '5 minutes (Test)' },
    60: { ja: '1時間', en: '1 hour' },
    180: { ja: '3時間', en: '3 hours' },
    360: { ja: '6時間', en: '6 hours' },
    720: { ja: '12時間', en: '12 hours' },
    1440: { ja: '24時間', en: '24 hours' },
    2880: { ja: '48時間', en: '48 hours' },
    4320: { ja: '72時間', en: '72 hours' }
  };
  return labels[interval];
}
