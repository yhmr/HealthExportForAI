// バックグラウンド同期サービス
// Expo Background Fetch と TaskManager を使用した定期的な自動同期

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { getNetworkStatus } from './networkService';
import { loadAutoSyncConfig, loadLastBackgroundSync, saveLastBackgroundSync } from './preferences';
import { processQueue } from './syncService';
import { getQueue } from './offlineQueueService';
import { useOfflineStore } from '../stores/offlineStore';
import { initializeHealthConnect, fetchAllHealthData } from './healthConnect';
import { executeExport } from './export/controller';
import { GoogleDriveAdapter } from './storage/googleDriveAdapter';
import { GoogleSheetsAdapter } from './storage/googleSheetsAdapter';
import { getDateDaysAgo, getEndOfToday, generateDateRange } from '../utils/formatters';

/** バックグラウンド同期タスク名 */
export const BACKGROUND_SYNC_TASK = 'HEALTH_EXPORT_BACKGROUND_SYNC';

/** 最小取得日数 */
const MIN_FETCH_DAYS = 7;
/** 最大取得日数 */
const MAX_FETCH_DAYS = 30;

/**
 * 動的に取得期間を計算
 * 前回同期からの経過日数と最小値の大きい方を返す（最大値で制限）
 */
export async function calculateFetchDays(): Promise<number> {
    const lastSync = await loadLastBackgroundSync();

    if (!lastSync) {
        return MIN_FETCH_DAYS;
    }

    const daysSinceLastSync = Math.ceil(
        (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60 * 24)
    );

    return Math.min(Math.max(daysSinceLastSync, MIN_FETCH_DAYS), MAX_FETCH_DAYS);
}

/**
 * バックグラウンド同期タスクの実行ロジック
 * TaskManager.defineTask から呼び出される
 */
async function executeBackgroundSync(): Promise<BackgroundFetch.BackgroundFetchResult> {
    console.log('[BackgroundSync] Task started');

    try {
        // 設定を確認
        const config = await loadAutoSyncConfig();
        if (!config.enabled) {
            console.log('[BackgroundSync] Auto sync is disabled');
            return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        // ネットワーク状態を確認
        const networkStatus = await getNetworkStatus();
        if (networkStatus !== 'online') {
            console.log('[BackgroundSync] Network is offline');
            return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        // Wi-Fi制限の確認は将来の拡張として保留
        // 現在のnetworkServiceは'online'/'offline'のみを返すため
        // Wi-Fi判定が必要な場合はnetworkServiceの拡張が必要

        let newDataExported = false;

        // === 新規データ取得・エクスポート ===
        try {
            // Health Connect を初期化
            const initialized = await initializeHealthConnect();
            if (!initialized) {
                console.log('[BackgroundSync] Health Connect initialization failed');
            } else {
                // 取得日数を動的に計算
                const fetchDays = await calculateFetchDays();
                console.log(`[BackgroundSync] Fetching data for ${fetchDays} days`);

                const startTime = getDateDaysAgo(fetchDays);
                const endTime = getEndOfToday();
                const dateRange = generateDateRange(startTime, endTime);

                // Health Connect からデータを取得
                const healthData = await fetchAllHealthData(startTime, endTime);

                // データがあるか確認
                const hasData = Object.values(healthData).some(
                    (arr) => Array.isArray(arr) && arr.length > 0
                );

                if (hasData) {
                    // アダプターを初期化
                    const storageAdapter = new GoogleDriveAdapter();
                    const spreadsheetAdapter = new GoogleSheetsAdapter();

                    // エクスポート実行
                    const exportResult = await executeExport(
                        healthData,
                        storageAdapter,
                        spreadsheetAdapter,
                        dateRange
                    );

                    if (exportResult.success) {
                        console.log('[BackgroundSync] New data exported successfully');
                        newDataExported = true;
                    } else {
                        console.error('[BackgroundSync] Export failed:', exportResult.error);
                    }
                } else {
                    console.log('[BackgroundSync] No health data available');
                }
            }
        } catch (fetchError) {
            console.error('[BackgroundSync] Data fetch/export error:', fetchError);
            // データ取得に失敗してもキュー処理は続行
        }

        // === オフラインキュー処理 ===
        const queueResult = await processQueue();
        console.log(`[BackgroundSync] Queue processed: ${queueResult.successCount} success, ${queueResult.failCount} failed`);

        // キュー件数を更新
        const queue = await getQueue();
        useOfflineStore.getState().setPendingCount(queue.length);

        // 同期成功時刻を記録
        if (newDataExported || queueResult.successCount > 0) {
            await saveLastBackgroundSync(new Date().toISOString());
        }

        return (newDataExported || queueResult.successCount > 0)
            ? BackgroundFetch.BackgroundFetchResult.NewData
            : BackgroundFetch.BackgroundFetchResult.NoData;

    } catch (error) {
        console.error('[BackgroundSync] Task failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
}

// グローバルスコープでタスクを定義
// このファイルがimportされた時点でタスクが登録される
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    return await executeBackgroundSync();
});

/**
 * バックグラウンド同期タスクを登録
 * @param intervalMinutes 同期間隔（分）
 */
export async function registerBackgroundSync(intervalMinutes: number): Promise<void> {
    console.log(`[BackgroundSync] Registering task with interval: ${intervalMinutes} minutes`);

    try {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
            minimumInterval: intervalMinutes * 60, // 秒に変換
            stopOnTerminate: false, // Android: アプリ終了後も継続
            startOnBoot: true, // Android: 再起動後も継続
        });
        console.log('[BackgroundSync] Task registered successfully');
    } catch (error) {
        console.error('[BackgroundSync] Failed to register task:', error);
        throw error;
    }
}

/**
 * バックグラウンド同期タスクを解除
 */
export async function unregisterBackgroundSync(): Promise<void> {
    console.log('[BackgroundSync] Unregistering task');

    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
        if (isRegistered) {
            await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
            console.log('[BackgroundSync] Task unregistered successfully');
        }
    } catch (error) {
        console.error('[BackgroundSync] Failed to unregister task:', error);
        throw error;
    }
}

/**
 * バックグラウンド同期タスクが登録されているか確認
 */
export async function isBackgroundSyncRegistered(): Promise<boolean> {
    return TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
}

/**
 * BackgroundFetchのステータスを取得
 */
export async function getBackgroundFetchStatus(): Promise<BackgroundFetch.BackgroundFetchStatus | null> {
    return BackgroundFetch.getStatusAsync();
}

/**
 * 設定に基づいてバックグラウンド同期を有効化/無効化
 */
export async function syncBackgroundTaskWithConfig(): Promise<void> {
    const config = await loadAutoSyncConfig();
    const isRegistered = await isBackgroundSyncRegistered();

    if (config.enabled && !isRegistered) {
        await registerBackgroundSync(config.intervalMinutes);
    } else if (!config.enabled && isRegistered) {
        await unregisterBackgroundSync();
    } else if (config.enabled && isRegistered) {
        // 間隔が変更された可能性があるため再登録
        await unregisterBackgroundSync();
        await registerBackgroundSync(config.intervalMinutes);
    }
}
