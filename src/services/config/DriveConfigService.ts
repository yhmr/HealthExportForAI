import { DEFAULT_DRIVE_CONFIG, DriveConfig, ExportFormat } from '../../config/driveConfig';
import { STORAGE_KEYS } from '../../config/storageKeys';
import { safeJsonParse } from '../infrastructure/json';
import { IKeyValueStorage } from '../infrastructure/types';

// シングルトンインスタンスの作成
import { keyValueStorage } from '../infrastructure/keyValueStorage';

/**
 * Drive設定サービス
 */
export class DriveConfigService {
  constructor(private storage: IKeyValueStorage) {}

  private sanitizeExportFormats(value: unknown): ExportFormat[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const formats = value.filter(
      (format): format is ExportFormat =>
        format === 'googleSheets' || format === 'csv' || format === 'json'
    );
    return formats.length > 0 ? formats : undefined;
  }

  private sanitizeDriveConfig(value: unknown): DriveConfig | null {
    // 期待する shape だけを抽出し、欠落/型不一致があれば null を返してデフォルトへフォールバックする。
    if (!value || typeof value !== 'object') return null;
    const raw = value as Record<string, unknown>;
    if (typeof raw.folderId !== 'string') return null;

    return {
      folderId: raw.folderId,
      folderName: typeof raw.folderName === 'string' ? raw.folderName : undefined,
      exportFormats: this.sanitizeExportFormats(raw.exportFormats),
      exportSheetAsPdf: typeof raw.exportSheetAsPdf === 'boolean' ? raw.exportSheetAsPdf : undefined
    };
  }

  /**
   * テスト用にストレージを差し替える
   * @internal
   */
  setStorage(storage: IKeyValueStorage): void {
    this.storage = storage;
  }

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
      const parsed = safeJsonParse<unknown>(json);
      const sanitized = this.sanitizeDriveConfig(parsed);
      if (sanitized) {
        return sanitized;
      }
    }
    return DEFAULT_DRIVE_CONFIG;
  }
}
export const driveConfigService = new DriveConfigService(keyValueStorage);
