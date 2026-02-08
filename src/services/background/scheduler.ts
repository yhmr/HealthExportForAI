// バックグラウンドタスクスケジューラ
// Expoのインフラ層（TaskManager, BackgroundFetch）とのインターフェース
// 実際のロジックは task.ts に委譲する

import notifee, { AndroidImportance } from '@notifee/react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { Language, translations } from '../../i18n/translations';
import { AutoSyncConfig } from '../../types/export';
import { backgroundSyncConfigService } from '../config/BackgroundSyncConfigService';
import { addDebugLog } from '../debugLogService';
import { keyValueStorage } from '../infrastructure/keyValueStorage';
import { executeSyncLogic } from './backgroundTask';

/** バックグラウンド同期タスク名 */
export const BACKGROUND_SYNC_TASK = 'HEALTH_EXPORT_BACKGROUND_SYNC';
const NOTIFICATION_CHANNEL_ID = 'background-sync';
const LANGUAGE_KEY = 'app_language';

addDebugLog('[Scheduler] Module loaded', 'info').catch(() => {});

/**
 * 現在の言語設定を取得
 */
async function getLanguage(): Promise<Language> {
  try {
    const savedLanguage = await keyValueStorage.getItem(LANGUAGE_KEY);
    return savedLanguage === 'ja' || savedLanguage === 'en' ? savedLanguage : 'ja';
  } catch {
    return 'ja';
  }
}

/**
 * 通知チャンネルを作成
 */
async function createChannel() {
  await notifee.createChannel({
    id: NOTIFICATION_CHANNEL_ID,
    name: 'Background Sync',
    importance: AndroidImportance.DEFAULT
  });
}

/**
 * タスクの実装を定義
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  await addDebugLog('[Scheduler] Background task triggered', 'info');

  // 言語設定をロード
  const language = await getLanguage();
  const t = translations[language].notification;

  // 通知ID
  const notificationId = 'bg-sync-notification';

  // Android 12+ の制約とOSサスペンド対策
  // 1. 通常の通知として「同期中」を表示（foreground serviceではない）
  // 2. timeoutAfterを設定し、OSによってプロセスが殺された場合でも通知が残らないようにする
  if (Platform.OS === 'android') {
    try {
      await createChannel();
      await notifee.displayNotification({
        id: notificationId,
        title: t.syncTitle, // "同期中..."
        body: t.syncBody, // "データをエクスポートしています"
        android: {
          channelId: NOTIFICATION_CHANNEL_ID,
          ongoing: true,
          progress: { indeterminate: true },
          timeoutAfter: 45000 // 45秒後にOSが強制削除（処理タイムアウトより長くする）
        }
      });
    } catch (e) {
      console.error('Start notification error:', e);
    }
  } else {
    // iOS: 通知は出さず、ログだけ残す
    await addDebugLog('[Scheduler] Background sync started (iOS)', 'info');
  }

  // 処理全体のタイムアウト（60秒）
  const BACKGROUND_TIMEOUT_MS = 60000;

  try {
    const config = await backgroundSyncConfigService.loadBackgroundSyncConfig();

    // タイムアウト付きで実行
    const result = await Promise.race([
      executeSyncLogic(config),
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Background sync timeout')), BACKGROUND_TIMEOUT_MS)
      )
    ]);

    if (result.success) {
      await addDebugLog(
        `[Scheduler] Task success. NewData: ${result.hasNewData}, Queue: ${result.hasQueueProcessed}`,
        'success'
      );

      // 新しいデータがあった、またはキュー処理が行われた場合のみ完了通知を表示
      if (result.hasNewData || result.hasQueueProcessed) {
        if (Platform.OS === 'android') {
          try {
            await createChannel();
            await notifee.displayNotification({
              id: notificationId,
              title: t.syncSuccess,
              body: t.syncSuccessBody,
              android: {
                channelId: NOTIFICATION_CHANNEL_ID,
                timeoutAfter: 5000 // 5秒後に消える
              }
            });
          } catch (notifError) {
            console.error('Success notification error:', notifError);
          }
        } else {
          // iOS: 通知は出さず、ログだけ残す
          await addDebugLog('[Scheduler] Background sync completed with updates (iOS)', 'info');
        }
      } else {
        await addDebugLog('[Scheduler] Background sync completed (no new data)', 'info');
      }

      return result.hasNewData || result.hasQueueProcessed
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.NoData;
    } else {
      await addDebugLog('[Scheduler] Task logic returned false', 'error');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  } catch (error) {
    await addDebugLog(
      `[Scheduler] Task exception: ${error instanceof Error ? error.message : String(error)}`,
      'error'
    );

    // エラー時のみ通知を表示
    if (Platform.OS === 'android') {
      try {
        await createChannel();
        await notifee.displayNotification({
          id: notificationId,
          title: t.syncError,
          body: t.syncErrorBody,
          android: {
            channelId: NOTIFICATION_CHANNEL_ID,
            timeoutAfter: 5000
          }
        });
      } catch (notifError) {
        console.error('Error notification error:', notifError);
      }
    }

    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * バックグラウンド同期タスクを登録
 * @param intervalMinutes 同期間隔（分）
 */
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * バックグラウンド同期タスクを登録
 * @param intervalMinutes 同期間隔（分）
 * @param retryCount 現在のリトライ回数（内部用）
 */
export async function registerBackgroundSync(
  intervalMinutes: number,
  retryCount = 0
): Promise<void> {
  if (retryCount === 0) {
    await addDebugLog(`[Scheduler] Registering task (interval: ${intervalMinutes}min)`, 'info');
  } else {
    console.warn(`[Scheduler] Retry registering task (${retryCount}/${MAX_RETRIES})...`);
  }

  try {
    // コンテキストチェックも兼ねてステータスを取得
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      await addDebugLog(
        `[Scheduler] Background fetch is restricted or denied. Status: ${status}`,
        'warn'
      );
      return;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: intervalMinutes * 60 // 秒に変換
    });
    await addDebugLog('[Scheduler] Task registered successfully', 'success');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (retryCount < MAX_RETRIES) {
      console.warn(
        `[Scheduler] Failed to register task: ${errorMessage}. Retrying in ${RETRY_DELAY_MS}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return registerBackgroundSync(intervalMinutes, retryCount + 1);
    }

    await addDebugLog(
      `[Scheduler] Failed to register task after ${MAX_RETRIES} retries (giving up): ${errorMessage}`,
      'warn'
    );
  }
}

/**
 * バックグラウンド同期タスクを解除
 */
/**
 * バックグラウンド同期タスクを解除
 * @param retryCount 現在のリトライ回数（内部用）
 */
export async function unregisterBackgroundSync(retryCount = 0): Promise<void> {
  if (retryCount === 0) {
    await addDebugLog('[Scheduler] Unregistering task', 'info');
  } else {
    console.warn(`[Scheduler] Retry unregistering task (${retryCount}/${MAX_RETRIES})...`);
  }

  try {
    // コンテキストが有効か確認するためにステータス取得を試みる
    // (ここで落ちる場合はContextが無効な可能性が高いためリトライへ回す)
    await BackgroundFetch.getStatusAsync();

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      await addDebugLog('[Scheduler] Task unregistered successfully', 'success');
    } else {
      await addDebugLog('[Scheduler] Task was not registered', 'info');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (retryCount < MAX_RETRIES) {
      console.warn(
        `[Scheduler] Failed to unregister task: ${errorMessage}. Retrying in ${RETRY_DELAY_MS}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return unregisterBackgroundSync(retryCount + 1);
    }

    await addDebugLog(
      `[Scheduler] Failed to unregister task after ${MAX_RETRIES} retries (giving up): ${errorMessage}`,
      'warn'
    );
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
 * @param config バックグラウンド同期設定
 */
export async function syncBackgroundTask(config: AutoSyncConfig): Promise<void> {
  try {
    const isRegistered = await isBackgroundSyncRegistered();

    if (config.enabled && !isRegistered) {
      await registerBackgroundSync(config.intervalMinutes);
    } else if (!config.enabled && isRegistered) {
      await unregisterBackgroundSync();
    } else if (config.enabled && isRegistered) {
      // 設定上の間隔と現在の登録状況の整合性はここではチェックせず、
      // 呼び出し側で変更があった場合に明示的に呼ばれることを想定するが、
      // 念のため再登録して確実に最新の間隔を反映させる
      await unregisterBackgroundSync();
      await registerBackgroundSync(config.intervalMinutes);
    }
  } catch (error) {
    await addDebugLog(`[Scheduler] Config sync failed: ${error}`, 'error');
  }
}
