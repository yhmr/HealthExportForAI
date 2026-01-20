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

// ============================================
// 自動同期設定
// ============================================

import type { AutoSyncConfig, SyncInterval } from '../types/offline';

const AUTO_SYNC_STORAGE_KEYS = {
    AUTO_SYNC_CONFIG: '@auto_sync_config',
    LAST_BACKGROUND_SYNC: '@last_background_sync',
} as const;

/** デフォルトの自動同期設定 */
export const DEFAULT_AUTO_SYNC_CONFIG: AutoSyncConfig = {
    enabled: false,
    intervalMinutes: 1440, // 24時間
    wifiOnly: true,
};

/**
 * 自動同期設定を保存
 */
export async function saveAutoSyncConfig(config: AutoSyncConfig): Promise<void> {
    await AsyncStorage.setItem(
        AUTO_SYNC_STORAGE_KEYS.AUTO_SYNC_CONFIG,
        JSON.stringify(config)
    );
}

/**
 * 自動同期設定を取得
 */
export async function loadAutoSyncConfig(): Promise<AutoSyncConfig> {
    const json = await AsyncStorage.getItem(AUTO_SYNC_STORAGE_KEYS.AUTO_SYNC_CONFIG);
    if (json) {
        return JSON.parse(json);
    }
    return DEFAULT_AUTO_SYNC_CONFIG;
}

/**
 * 最後のバックグラウンド同期時刻を保存
 */
export async function saveLastBackgroundSync(time: string): Promise<void> {
    await AsyncStorage.setItem(AUTO_SYNC_STORAGE_KEYS.LAST_BACKGROUND_SYNC, time);
}

/**
 * 最後のバックグラウンド同期時刻を取得
 */
export async function loadLastBackgroundSync(): Promise<string | null> {
    return AsyncStorage.getItem(AUTO_SYNC_STORAGE_KEYS.LAST_BACKGROUND_SYNC);
}

/**
 * 同期間隔のラベルを取得
 */
export function getSyncIntervalLabel(interval: SyncInterval): { ja: string; en: string } {
    const labels: Record<SyncInterval, { ja: string; en: string }> = {
        60: { ja: '1時間', en: '1 hour' },
        180: { ja: '3時間', en: '3 hours' },
        360: { ja: '6時間', en: '6 hours' },
        720: { ja: '12時間', en: '12 hours' },
        1440: { ja: '24時間', en: '24 hours' },
        2880: { ja: '48時間', en: '48 hours' },
        4320: { ja: '72時間', en: '72 hours' },
    };
    return labels[interval];
}

/** 利用可能な同期間隔一覧 */
export const SYNC_INTERVALS: SyncInterval[] = [60, 180, 360, 720, 1440, 2880, 4320];

