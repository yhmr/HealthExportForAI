import { STORAGE_KEYS } from '../../config/storageKeys';
import { AutoSyncConfig, DEFAULT_AUTO_SYNC_CONFIG } from '../../types/exportTypes';
import { IKeyValueStorage } from '../../types/storage';

// シングルトンインスタンスの作成
import { keyValueStorage } from '../infrastructure/keyValueStorage';

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

/**
 * 利用可能な同期間隔一覧
 * Note: iOSではシステムが最適なタイミングを決定するため、この設定は「最小間隔の推奨値」として扱われます。
 * 実際には設定値よりも長い間隔で実行される、あるいはバッテリー状況等により実行されない場合があります。
 * 最小値は約15分です。
 */
export const SYNC_INTERVALS: import('../../types/exportTypes').SyncInterval[] = [
  5, 60, 180, 360, 720, 1440, 2880, 4320
];

/**
 * 同期間隔のラベルを取得
 */
export function getSyncIntervalLabel(interval: import('../../types/exportTypes').SyncInterval): {
  ja: string;
  en: string;
} {
  const labels: Record<import('../../types/exportTypes').SyncInterval, { ja: string; en: string }> =
    {
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
export const backgroundSyncConfigService = new BackgroundSyncConfigService(keyValueStorage);
