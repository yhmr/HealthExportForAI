// バックグラウンドタスクスケジューラ
// Expoのインフラ層（TaskManager, BackgroundFetch）とのインターフェース
// 実際のロジックは task.ts に委譲する

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { loadBackgroundSyncConfig } from '../config/backgroundSyncConfig';
import { addDebugLog } from '../debugLogService';
import { executeSyncLogic } from './sync-operation';

/** バックグラウンド同期タスク名 */
export const BACKGROUND_SYNC_TASK = 'HEALTH_EXPORT_BACKGROUND_SYNC';

addDebugLog('[Scheduler] Module loaded', 'info').catch(() => { });

/**
 * タスクの実装を定義
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    await addDebugLog('[Scheduler] Background task triggered', 'info');
    try {
        const result = await executeSyncLogic();

        if (result.success) {
            await addDebugLog(`[Scheduler] Task success. NewData: ${result.hasNewData}, Queue: ${result.hasQueueProcessed}`, 'success');
            return (result.hasNewData || result.hasQueueProcessed)
                ? BackgroundFetch.BackgroundFetchResult.NewData
                : BackgroundFetch.BackgroundFetchResult.NoData;
        } else {
            await addDebugLog('[Scheduler] Task logic returned false', 'error');
            return BackgroundFetch.BackgroundFetchResult.Failed;
        }
    } catch (error) {
        await addDebugLog(`[Scheduler] Task exception: ${error instanceof Error ? error.message : String(error)}`, 'error');
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

/**
 * バックグラウンド同期タスクを登録
 * @param intervalMinutes 同期間隔（分）
 */
export async function registerBackgroundSync(intervalMinutes: number): Promise<void> {
    await addDebugLog(`[Scheduler] Registering task (interval: ${intervalMinutes}min)`, 'info');

    try {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
            minimumInterval: intervalMinutes * 60, // 秒に変換
            stopOnTerminate: false, // Android: アプリ終了後も継続
            startOnBoot: true, // Android: 再起動後も継続
        });
        await addDebugLog('[Scheduler] Task registered successfully', 'success');
    } catch (error) {
        await addDebugLog(`[Scheduler] Failed to register task: ${error}`, 'error');
    }
}

/**
 * バックグラウンド同期タスクを解除
 */
export async function unregisterBackgroundSync(): Promise<void> {
    await addDebugLog('[Scheduler] Unregistering task', 'info');

    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
        if (isRegistered) {
            await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
            await addDebugLog('[Scheduler] Task unregistered successfully', 'success');
        } else {
            await addDebugLog('[Scheduler] Task was not registered', 'info');
        }
    } catch (error) {
        await addDebugLog(`[Scheduler] Failed to unregister task: ${error}`, 'error');
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
    try {
        const config = await loadBackgroundSyncConfig();
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
    } catch (error) {
        await addDebugLog(`[Scheduler] Config sync failed: ${error}`, 'error');
    }
}
