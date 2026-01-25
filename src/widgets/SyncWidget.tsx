import React from 'react';
import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget';
import { WIDGET_ICON_BASE64 } from './widget-icon';

interface SyncWidgetProps {
  lastSyncTime?: string | null;
  status?: 'idle' | 'syncing' | 'success' | 'error';
}

export function SyncWidget({ lastSyncTime, status = 'idle' }: SyncWidgetProps) {
  const isSyncing = status === 'syncing';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: isSyncing ? '#9ABF9F' : '#CFEAD1',
        borderRadius: 32,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginVertical: 8, // 上下を削ってスリムにする
        borderWidth: 2, // 枠線を追加してボタン感を出す
        borderColor: isSyncing ? '#6E9672' : '#A3CFA8' // 枠線も状態に合わせて少し変える
      }}
      clickAction="SYNC_CLICKED"
    >
      <ImageWidget
        image={WIDGET_ICON_BASE64}
        imageWidth={52}
        imageHeight={52}
        style={
          {
            // marginなし
          }
        }
      />

      <FlexWidget
        style={{
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          marginLeft: 8,
          flex: 1
        }}
      >
        <TextWidget
          text={isSyncing ? 'Syncing' : 'Sync Now'}
          style={{
            fontSize: 20,
            fontFamily: 'sans-serif-medium',
            color: '#1a4d2e',
            fontWeight: 'bold',
            marginBottom: 4,
            adjustsFontSizeToFit: true
          }}
          maxLines={1}
        />

        <TextWidget
          text="Last Updated :"
          style={{
            fontSize: 11,
            color: '#4f7d5e',
            marginBottom: 2,
            marginLeft: 4
          }}
        />

        <TextWidget
          text={
            lastSyncTime
              ? new Date(lastSyncTime).toLocaleTimeString('ja-JP', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : '--/-- --:--'
          }
          style={{
            fontSize: 11,
            color: '#4f7d5e',
            fontWeight: 'bold',
            marginLeft: 12
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
