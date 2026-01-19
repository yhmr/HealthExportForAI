// ローカルストレージサービス

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DriveConfig, ExportFormat } from '../config/driveConfig';
import { DEFAULT_DRIVE_CONFIG, DEFAULT_EXPORT_FORMATS } from '../config/driveConfig';

const STORAGE_KEYS = {
    DRIVE_CONFIG: '@drive_config',
    LAST_SYNC_TIME: '@last_sync_time',
    EXPORT_PERIOD_DAYS: '@export_period_days',
    EXPORT_FORMATS: '@export_formats',
} as const;

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

/**
 * 最後の同期時刻を保存
 */
export async function saveLastSyncTime(time: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, time);
}

/**
 * 最後の同期時刻を取得
 */
export async function loadLastSyncTime(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
}

/**
 * エクスポート期間（日数）を保存
 */
export async function saveExportPeriodDays(days: number): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.EXPORT_PERIOD_DAYS, days.toString());
}

/**
 * エクスポート期間（日数）を取得（デフォルト7日）
 */
export async function loadExportPeriodDays(): Promise<number> {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.EXPORT_PERIOD_DAYS);
    return value ? parseInt(value, 10) : 7;
}

/**
 * エクスポート形式を保存
 */
export async function saveExportFormats(formats: ExportFormat[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.EXPORT_FORMATS, JSON.stringify(formats));
}

/**
 * エクスポート形式を取得（デフォルト: googleSheets）
 */
export async function loadExportFormats(): Promise<ExportFormat[]> {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.EXPORT_FORMATS);
    if (json) {
        // 古い'pdf'形式が含まれていたら除外
        const formats = JSON.parse(json) as string[];
        return formats.filter(f => f !== 'pdf') as ExportFormat[];
    }
    return DEFAULT_EXPORT_FORMATS;
}

/**
 * SheetsをPDFとしてもエクスポートするオプションを保存
 */
export async function saveExportSheetAsPdf(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem('@export_sheet_as_pdf', enabled ? 'true' : 'false');
}

/**
 * SheetsをPDFとしてもエクスポートするオプションを取得
 */
export async function loadExportSheetAsPdf(): Promise<boolean> {
    const value = await AsyncStorage.getItem('@export_sheet_as_pdf');
    return value === 'true';
}
