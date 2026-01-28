import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { WEB_CLIENT_ID } from '../config/driveConfig';
import { loadLastSyncTime } from '../services/config/exportConfig';
import { configureGoogleSignIn, isSignedIn, signIn } from '../services/googleAuth';
import { SyncService } from '../services/syncService';
import { SyncWidget } from './SyncWidget';
import { SyncWidgetSmall } from './SyncWidgetSmall';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  console.log(
    '[Widget] Handler called with action:',
    props.widgetAction,
    'Widget:',
    props.widgetInfo?.widgetName
  );

  // ウィジェット名に応じてレンダリングする関数
  const renderCurrentWidget = (
    status: 'idle' | 'syncing' | 'success' | 'error',
    lastSyncTime?: string | null
  ) => {
    const isSmall = props.widgetInfo?.widgetName === 'SyncWidgetSmall';

    if (isSmall) {
      props.renderWidget(<SyncWidgetSmall status={status} />);
    } else {
      props.renderWidget(<SyncWidget lastSyncTime={lastSyncTime} status={status} />);
    }
  };

  switch (props.widgetAction as string) {
    case 'SYNC_CLICKED':
    case 'WIDGET_CLICK':
      try {
        console.log('[Widget] Starting sync process...');

        // 1. 即座に「Syncing...」状態を表示
        const now = new Date().toISOString();
        renderCurrentWidget('syncing', now);

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
          renderCurrentWidget('error', null);
          // 数秒後にアイドルに戻す
          await new Promise((resolve) => setTimeout(resolve, 3000));

          const lastTime = await loadLastSyncTime();
          renderCurrentWidget('idle', lastTime);
          return;
        }

        // 4. データ取得 & エクスポート (一括実行)
        console.log('[Widget] Starting sync and upload...');

        // 0を指定して「今日のみ」を取得
        // syncAndUploadはData new -> Queued -> Uploadを内部で処理する
        const { syncResult, exportResult } = await SyncService.syncAndUpload(0);

        if (!syncResult.success || !syncResult.isNewData) {
          console.log('[Widget] No new data found or sync failed');
          const lastTime = await loadLastSyncTime();
          renderCurrentWidget('idle', lastTime);
          return;
        }

        if (exportResult && exportResult.successCount > 0) {
          console.log('[Widget] Sync success!');
          // アップロード成功時は SyncService が saveLastSyncTime しているので、それをロードすれば最新になる
        } else {
          console.log('[Widget] Data queued but upload not finished (or other state)');
        }

        // 常に保存されている最終同期時刻を表示してアイドルに戻る
        const lastTime = await loadLastSyncTime();
        renderCurrentWidget('idle', lastTime);
      } catch (error) {
        console.error('Widget sync error:', error);
        renderCurrentWidget('error', null);
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // エラー後も保存されている時刻を表示
        const lastTime = await loadLastSyncTime();
        renderCurrentWidget('idle', lastTime);
      }
      break;

    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      {
        // 初期表示
        const lastTime = await loadLastSyncTime();
        renderCurrentWidget('idle', lastTime);
      }
      break;

    case 'WIDGET_DELETED':
      break;

    default:
      break;
  }
}
