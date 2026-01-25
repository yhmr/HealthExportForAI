import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { WEB_CLIENT_ID } from '../config/driveConfig';
import {
  addToExportQueue,
  BACKGROUND_EXECUTION_TIMEOUT_MS,
  processExportQueue
} from '../services/export/service';
import { configureGoogleSignIn, isSignedIn, signIn } from '../services/googleAuth';
import { fetchAllHealthData } from '../services/healthConnect';
import { generateDateRange, getDateDaysAgo, getEndOfToday } from '../utils/formatters';
import { SyncWidget } from './SyncWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  console.log('[Widget] Handler called with action:', props.widgetAction);

  switch (props.widgetAction as string) {
    case 'SYNC_CLICKED':
    case 'WIDGET_CLICK':
      try {
        console.log('[Widget] Starting sync process...');

        // 1. 即座に「Syncing...」状態を表示
        const now = new Date().toISOString();
        props.renderWidget(<SyncWidget lastSyncTime={now} status="syncing" />);

        // 2. Google認証設定 (必須)
        configureGoogleSignIn(WEB_CLIENT_ID);

        // 3. 認証状態チェック
        let authenticated = await isSignedIn();
        if (!authenticated) {
          console.log('[Widget] Not signed in, attempting silent sign-in...');
          const result = await signIn(); // Headlessでのsilent sign-inを期待
          authenticated = result.success;
        }

        if (!authenticated) {
          console.error('[Widget] Auth failed');
          props.renderWidget(<SyncWidget status="error" />);
          // 数秒後にアイドルに戻す（エラー表示を残すため少し待つ）
          await new Promise((resolve) => setTimeout(resolve, 3000));
          props.renderWidget(<SyncWidget lastSyncTime={null} status="idle" />);
          return;
        }

        // 4. データ取得 (本日分)
        const endDate = getEndOfToday();
        const startDate = getDateDaysAgo(0); // 今日のみ
        console.log(
          `[Widget] Fetching data for ${startDate.toISOString()} - ${endDate.toISOString()}`
        );

        // Health Connectからデータ取得
        // ※バックグラウンド権限がないと失敗する可能性があるが、アプリ側で許可済み前提
        const healthData = await fetchAllHealthData(startDate, endDate);
        const dateRange = generateDateRange(startDate, endDate);

        // 5. キューに追加
        const added = await addToExportQueue(healthData, dateRange);
        if (!added) {
          console.error('[Widget] Failed to add to queue');
          props.renderWidget(<SyncWidget status="error" />);
          return;
        }

        // 6. エクスポート実行 (タイムアウト付き)
        console.log('[Widget] Processing queue...');
        const result = await processExportQueue(BACKGROUND_EXECUTION_TIMEOUT_MS);

        if (result.successCount > 0) {
          console.log('[Widget] Sync success!');
          props.renderWidget(<SyncWidget lastSyncTime={new Date().toISOString()} status="idle" />);
        } else {
          console.warn('[Widget] Sync finished but no success count (maybe skipped or failed)');
          // 部分失敗でもエラー扱いにするか、古い時刻のままアイドルに戻す
          props.renderWidget(<SyncWidget status="error" />);
          await new Promise((resolve) => setTimeout(resolve, 3000));
          props.renderWidget(<SyncWidget lastSyncTime={now} status="idle" />); // 直前の時刻に戻す
        }
      } catch (error) {
        console.error('Widget sync error:', error);
        props.renderWidget(<SyncWidget status="error" />);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        // エラー時は時刻更新せずアイドルへ
        props.renderWidget(<SyncWidget lastSyncTime={null} status="idle" />);
      }
      break;

    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      {
        // 初期表示
        props.renderWidget(<SyncWidget lastSyncTime={null} status="idle" />);
      }
      break;

    case 'WIDGET_DELETED':
      break;

    default:
      break;
  }
}
