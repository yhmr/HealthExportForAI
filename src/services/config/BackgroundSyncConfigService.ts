import { STORAGE_KEYS } from '../../config/storageKeys';
import { AutoSyncConfig, DEFAULT_AUTO_SYNC_CONFIG } from '../../types/exportTypes';
import { IKeyValueStorage } from '../../types/storage';

/**
 * バックグラウンド同期設定サービス
 */
export class BackgroundSyncConfigService {
  constructor(private storage: IKeyValueStorage) {}

  /**
   * テスト用にストレージを差し替える
   * @internal
   */
  setStorage(storage: IKeyValueStorage): void {
    this.storage = storage;
  }

  /**
   * バックグラウンド同期設定を保存
   */
  async saveBackgroundSyncConfig(config: AutoSyncConfig): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.BACKGROUND_SYNC_CONFIG, JSON.stringify(config));
  }

  /**
   * バックグラウンド同期設定を取得
   */
  async loadBackgroundSyncConfig(): Promise<AutoSyncConfig> {
    const json = await this.storage.getItem(STORAGE_KEYS.BACKGROUND_SYNC_CONFIG);
    if (json) {
      return JSON.parse(json);
    }
    return DEFAULT_AUTO_SYNC_CONFIG;
  }

  /**
   * 最後のバックグラウンド同期時刻を取得
   * (実質的には統合されたLastSyncTimeを返す)
   */
  async loadLastBackgroundSync(): Promise<string | null> {
    return this.storage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
  }
}
