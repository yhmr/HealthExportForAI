import { DEFAULT_DRIVE_CONFIG, DriveConfig } from '../../config/driveConfig';
import { STORAGE_KEYS } from '../../config/storageKeys';
import { IKeyValueStorage } from '../interfaces/IKeyValueStorage';

/**
 * Drive設定サービス
 */
export class DriveConfigService {
  constructor(private storage: IKeyValueStorage) {}

  /**
   * Drive設定を保存
   */
  async saveDriveConfig(config: DriveConfig): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.DRIVE_CONFIG, JSON.stringify(config));
  }

  /**
   * Drive設定を取得
   */
  async loadDriveConfig(): Promise<DriveConfig> {
    const json = await this.storage.getItem(STORAGE_KEYS.DRIVE_CONFIG);
    if (json) {
      return JSON.parse(json);
    }
    return DEFAULT_DRIVE_CONFIG;
  }
}
