import React from 'react';
import { FlexWidget, ImageWidget } from 'react-native-android-widget';
import { WIDGET_ICON_BASE64 } from './widget-icon';

interface SyncWidgetSmallProps {
  status?: 'idle' | 'syncing' | 'success' | 'error';
}

export function SyncWidgetSmall({ status = 'idle' }: SyncWidgetSmallProps) {
  const isSyncing = status === 'syncing';
  const isError = status === 'error';

  // 背景色: 通常時は薄い緑、同期中は少し濃い緑、エラー時は薄い赤
  const backgroundColor = isError ? '#FFCDD2' : isSyncing ? '#9ABF9F' : '#CFEAD1';
  const borderColor = isError ? '#E57373' : isSyncing ? '#6E9672' : '#A3CFA8';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: backgroundColor,
        borderRadius: 24,
        borderColor: borderColor,
        borderWidth: 2
      }}
      clickAction="SYNC_CLICKED"
    >
      <ImageWidget image={WIDGET_ICON_BASE64} imageWidth={40} imageHeight={40} />
    </FlexWidget>
  );
}
