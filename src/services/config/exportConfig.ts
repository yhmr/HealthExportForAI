import { ExportFormat } from '../../config/driveConfig';
import { ExportConfig } from '../../types/exportTypes';
import { AsyncStorageAdapter } from '../infrastructure/AsyncStorageAdapter';
import { ExportConfigService } from './ExportConfigService';
import { loadDriveConfig } from './driveConfig'; // 追加

// シングルトンインスタンスの作成（デフォルトでAsyncStorageAdapterを使用）
const storageAdapter = new AsyncStorageAdapter();
const exportConfigService = new ExportConfigService(storageAdapter);

/**
 * 初期設定完了フラグを保存
 */
export function saveIsSetupCompleted(completed: boolean): Promise<void> {
  return exportConfigService.saveIsSetupCompleted(completed);
}

/**
 * 初期設定完了フラグを取得
 */
export function loadIsSetupCompleted(): Promise<boolean> {
  return exportConfigService.loadIsSetupCompleted();
}

/**
 * 最後の同期時刻を取得
 */
export function loadLastSyncTime(): Promise<string | null> {
  return exportConfigService.loadLastSyncTime();
}

/**
 * 最後の同期時刻を保存
 */
export function saveLastSyncTime(time: string): Promise<void> {
  return exportConfigService.saveLastSyncTime(time);
}

/**
 * エクスポート期間（日数）を保存
 */
export function saveExportPeriodDays(days: number): Promise<void> {
  return exportConfigService.saveExportPeriodDays(days);
}

/**
 * エクスポート期間（日数）を取得（デフォルト7日）
 */
export function loadExportPeriodDays(): Promise<number> {
  return exportConfigService.loadExportPeriodDays();
}

/**
 * エクスポート形式を保存
 */
export function saveExportFormats(formats: ExportFormat[]): Promise<void> {
  return exportConfigService.saveExportFormats(formats);
}

/**
 * エクスポート形式を取得（デフォルト: googleSheets）
 */
export function loadExportFormats(): Promise<ExportFormat[]> {
  return exportConfigService.loadExportFormats();
}

/**
 * SheetsをPDFとしてもエクスポートするオプションを保存
 */
export function saveExportSheetAsPdf(enabled: boolean): Promise<void> {
  return exportConfigService.saveExportSheetAsPdf(enabled);
}

/**
 * SheetsをPDFとしてもエクスポートするオプションを取得
 */
export function loadExportSheetAsPdf(): Promise<boolean> {
  return exportConfigService.loadExportSheetAsPdf();
}

/**
 * 選択されたデータタグを保存
 */
export function saveSelectedDataTags(tags: string[]): Promise<void> {
  return exportConfigService.saveSelectedDataTags(tags);
}

/**
 * 選択されたデータタグを取得
 */
export function loadSelectedDataTags(): Promise<string[] | null> {
  return exportConfigService.loadSelectedDataTags();
}

/**
 * 最後の同期時刻を削除（初期データ再取得のため）
 */
export function removeLastSyncTime(): Promise<void> {
  return exportConfigService.removeLastSyncTime();
}

/**
 * デフォルトのエクスポート設定を生成
 */
export async function createDefaultExportConfig(): Promise<ExportConfig> {
  const formats = await loadExportFormats();
  const exportAsPdf = await loadExportSheetAsPdf();
  const driveConfig = await loadDriveConfig();

  return {
    formats,
    exportAsPdf,
    targetFolder: {
      id: driveConfig?.folderId,
      name: driveConfig?.folderName
    }
  };
}

// DI注入用（SyncService等）にサービスインスタンスをエクスポート
export { ExportConfigService } from './ExportConfigService';
export { exportConfigService };
