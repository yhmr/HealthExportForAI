// バックグラウンド同期設定サービス

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../config/storageKeys';
import { AutoSyncConfig, DEFAULT_AUTO_SYNC_CONFIG } from '../../types/exportTypes';

// ===== UI用のヘルパー関数と定数 =====

import type { SyncInterval } from '../../types/exportTypes';

/**
 * バックグラウンド同期設定を保存
 */
export async function saveBackgroundSyncConfig(config: AutoSyncConfig): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.BACKGROUND_SYNC_CONFIG, JSON.stringify(config));
}

/**
 * バックグラウンド同期設定を取得
 */
export async function loadBackgroundSyncConfig(): Promise<AutoSyncConfig> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.BACKGROUND_SYNC_CONFIG);
  if (json) {
    return JSON.parse(json);
  }
  return DEFAULT_AUTO_SYNC_CONFIG;
}

/**
 * 最後のバックグラウンド同期時刻を取得
 * (実質的には統合されたLastSyncTimeを返す)
 */
export async function loadLastBackgroundSync(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
}

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
