// バックグラウンドタスクスケジューラ
// Expoのインフラ層（TaskManager, BackgroundFetch）とのインターフェース
// 実際のロジックは task.ts に委譲する

import notifee, { AndroidImportance } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { Language, translations } from '../../i18n/translations';
import { AutoSyncConfig } from '../../types/offline';
import { loadBackgroundSyncConfig } from '../config/backgroundSyncConfig';
import { addDebugLog } from '../debugLogService';
import { executeSyncLogic } from './sync-operation';

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
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
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

  // Android 12+ の制約により、バックグラウンドからフォアグラウンドサービスを開始することは困難なため、
  // 進行中の通知 ("同期中...") は表示しない。
  // OSによってタスクがサスペンドされた場合に通知が残り続ける問題を回避するため。

  try {
    const config = await loadBackgroundSyncConfig();
    const result = await executeSyncLogic(config);

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
        }
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
export async function registerBackgroundSync(intervalMinutes: number): Promise<void> {
  await addDebugLog(`[Scheduler] Registering task (interval: ${intervalMinutes}min)`, 'info');

  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: intervalMinutes * 60, // 秒に変換
      stopOnTerminate: false, // Android: アプリ終了後も継続
      startOnBoot: true // Android: 再起動後も継続
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
