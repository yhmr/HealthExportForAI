import { DEFAULT_EXPORT_FORMATS, ExportFormat } from '../../config/driveConfig';
import { STORAGE_KEYS } from '../../config/storageKeys';
import { safeJsonParse } from '../infrastructure/json';
import { IKeyValueStorage } from '../infrastructure/types';

// シングルトンインスタンスの作成
import { keyValueStorage } from '../infrastructure/keyValueStorage';

/**
 * エクスポート設定サービス
 */
export class ExportConfigService {
  constructor(private storage: IKeyValueStorage) {}

  /**
   * 初期設定完了フラグを保存
   */
  async saveIsSetupCompleted(completed: boolean): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.IS_SETUP_COMPLETED, completed ? 'true' : 'false');
  }

  /**
   * 初期設定完了フラグを取得
   */
  async loadIsSetupCompleted(): Promise<boolean> {
    const value = await this.storage.getItem(STORAGE_KEYS.IS_SETUP_COMPLETED);
    return value === 'true';
  }

  /**
   * テスト用にストレージを差し替える
   * @internal
   */
  setStorage(storage: IKeyValueStorage): void {
    this.storage = storage; // Note: storage should be mutable (remove readonly if present or just work because private is mutable by default unless readonly)
  }

  /**
   * 最後の同期時刻を取得
   */
  async loadLastSyncTime(): Promise<string | null> {
    return this.storage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
  }

  /**
   * 最後の同期時刻を保存
   */
  async saveLastSyncTime(time: string): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, time);
  }

  /**
   * エクスポート期間（日数）を保存
   */
  async saveExportPeriodDays(days: number): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.EXPORT_PERIOD_DAYS, days.toString());
  }

  /**
   * エクスポート期間（日数）を取得（デフォルト7日）
   */
  async loadExportPeriodDays(): Promise<number> {
    const value = await this.storage.getItem(STORAGE_KEYS.EXPORT_PERIOD_DAYS);
    if (!value) return 7;
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
  }

  /**
   * エクスポート形式を保存
   */
  async saveExportFormats(formats: ExportFormat[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.EXPORT_FORMATS, JSON.stringify(formats));
  }

  /**
   * エクスポート形式を取得（デフォルト: googleSheets）
   */
  async loadExportFormats(): Promise<ExportFormat[]> {
    const json = await this.storage.getItem(STORAGE_KEYS.EXPORT_FORMATS);
    if (json) {
      const parsed = safeJsonParse<unknown>(json);
      if (Array.isArray(parsed)) {
        // 文字列配列のみ受け入れ、許可された形式以外は除外して安全側に倒す。
        // 古い'pdf'形式が含まれていたら除外
        return parsed.filter(
          (f): f is ExportFormat => f === 'googleSheets' || f === 'csv' || f === 'json'
        );
      }
    }
    return DEFAULT_EXPORT_FORMATS;
  }

  /**
   * SheetsをPDFとしてもエクスポートするオプションを保存
   */
  async saveExportSheetAsPdf(enabled: boolean): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.EXPORT_SHEET_AS_PDF, enabled ? 'true' : 'false');
  }

  /**
   * SheetsをPDFとしてもエクスポートするオプションを取得
   */
  async loadExportSheetAsPdf(): Promise<boolean> {
    const value = await this.storage.getItem(STORAGE_KEYS.EXPORT_SHEET_AS_PDF);
    return value === 'true';
  }

  /**
   * 選択されたデータタグを保存
   */
  async saveSelectedDataTags(tags: string[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.SELECTED_DATA_TAGS, JSON.stringify(tags));
  }

  /**
   * 選択されたデータタグを取得
   */
  async loadSelectedDataTags(): Promise<string[] | null> {
    const json = await this.storage.getItem(STORAGE_KEYS.SELECTED_DATA_TAGS);
    if (json) {
      const parsed = safeJsonParse<unknown>(json);
      if (Array.isArray(parsed)) {
        // 文字列以外が混入していても落とし、正常なタグだけ復元する。
        return parsed.filter((tag): tag is string => typeof tag === 'string');
      }
    }
    return null;
  }

  /**
   * 最後の同期時刻を削除
   */
  async removeLastSyncTime(): Promise<void> {
    await this.storage.removeItem(STORAGE_KEYS.LAST_SYNC_TIME);
  }
}
export const exportConfigService = new ExportConfigService(keyValueStorage);
