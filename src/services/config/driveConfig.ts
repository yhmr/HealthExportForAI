// Google Drive設定サービス

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_DRIVE_CONFIG, DriveConfig } from '../../config/driveConfig';
import { STORAGE_KEYS } from '../../config/storageKeys';

/**
 * Drive設定を保存
 */
export async function saveDriveConfig(config: DriveConfig): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.DRIVE_CONFIG, JSON.stringify(config));
}

/**
 * Drive設定を取得
 */
export async function loadDriveConfig(): Promise<DriveConfig> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.DRIVE_CONFIG);
  if (json) {
    return JSON.parse(json);
  }
  return DEFAULT_DRIVE_CONFIG;
}
