import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { SyncWidget } from './SyncWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  console.log('[Widget] Handler called with action:', props.widgetAction);

  // widgetActionは型定義上文字列リテラルユニオンだが、実際には文字列として扱う
  switch (props.widgetAction as string) {
    case 'SYNC_CLICKED':
    case 'WIDGET_CLICK': // フォールバック: どこを押しても反応するようにする
      try {
        console.log('[Widget] Click logic triggered (Action: ' + props.widgetAction + ')');

        // 1. 即座に「Syncing...」状態を表示 (UI更新のテスト)
        const now = new Date().toISOString();
        props.renderWidget(<SyncWidget lastSyncTime={now} status="syncing" />);

        // 2. 擬似的な待機時間
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 3. 完了状態へ更新
        console.log('[Widget] Simulation finished');
        props.renderWidget(<SyncWidget lastSyncTime={new Date().toISOString()} status="idle" />);
      } catch (error) {
        console.error('Widget sync error:', error);
        props.renderWidget(<SyncWidget status="error" />);
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
      // 標準イベント
      break;

    default:
      break;
  }
}
