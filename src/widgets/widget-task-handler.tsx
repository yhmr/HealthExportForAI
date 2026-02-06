import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { exportConfigService } from '../services/config/ExportConfigService';
import { addDebugLog } from '../services/debugLogService';
import { initializeForSync } from '../services/syncInitializer';
import { SyncService } from '../services/syncService';
import { SyncWidget } from './SyncWidget';
import { SyncWidgetSmall } from './SyncWidgetSmall';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  // ウィジェット名に応じてレンダリングする関数
  const renderCurrentWidget = (
    status: 'idle' | 'syncing' | 'success' | 'error' | 'permission_required' | 'login_required',
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
        // 1. 即座に「Syncing...」状態を表示
        const now = new Date().toISOString();
        renderCurrentWidget('syncing', now);

        // 2. 共通初期化処理（認証 + Health Connect初期化 + 権限チェック）
        const initResult = await initializeForSync();
        if (!initResult.success) {
          await addDebugLog(`[Widget] Initialization failed: ${initResult.error}`, 'error');

          // エラー種別に応じたUI状態を表示
          if (initResult.error === 'auth_failed') {
            renderCurrentWidget('login_required', null);
          } else if (initResult.error === 'permission_denied') {
            renderCurrentWidget('permission_required', null);
          } else {
            renderCurrentWidget('error', null);
          }

          // 数秒後にアイドルに戻す
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const lastTime = await exportConfigService.loadLastSyncTime();
          renderCurrentWidget('idle', lastTime);
          return;
        }

        // 3. データ取得 & エクスポート (一括実行)
        // 前回同期からの差分を取得
        const fullSyncResult = await SyncService.executeFullSync();

        if (!fullSyncResult.isOk()) {
          throw new Error(fullSyncResult.unwrapErr().message);
        }
        const { syncResult } = fullSyncResult.unwrap();

        if (!syncResult.success || !syncResult.isNewData) {
          const lastTime = await exportConfigService.loadLastSyncTime();
          renderCurrentWidget('idle', lastTime);
          return;
        }

        // 常に保存されている最終同期時刻を表示してアイドルに戻る
        const lastTime = await exportConfigService.loadLastSyncTime();
        renderCurrentWidget('idle', lastTime);
      } catch (error) {
        await addDebugLog(`[Widget] Sync error: ${error}`, 'error');
        renderCurrentWidget('error', null);
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // エラー後も保存されている時刻を表示
        const lastTime = await exportConfigService.loadLastSyncTime();
        renderCurrentWidget('idle', lastTime);
      }
      break;

    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      {
        // 初期表示
        const lastTime = await exportConfigService.loadLastSyncTime();
        renderCurrentWidget('idle', lastTime);
      }
      break;

    case 'WIDGET_DELETED':
      break;

    default:
      break;
  }
}
