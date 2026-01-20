// ネットワーク状態バナーコンポーネント
// オフライン状態と未同期データ件数を表示

import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useNetworkStore } from '../stores/networkStore';
import { useOfflineStore } from '../stores/offlineStore';

/**
 * バナーの表示状態
 */
type BannerState = 'hidden' | 'offline' | 'syncing' | 'syncComplete' | 'syncError';

/**
 * ネットワーク状態を表示するバナー
 * - オフライン時: 「オフライン」アイコンとテキスト、未同期件数
 * - 同期中: 「同期中...」表示
 * - オンライン時: 非表示（またはフェードアウト）
 */
export function NetworkStatusBanner() {
  const { t } = useLanguage();
  const isOnline = useNetworkStore((state) => state.isOnline);
  const pendingCount = useOfflineStore((state) => state.pendingCount);
  const isProcessing = useOfflineStore((state) => state.isProcessing);
  const lastError = useOfflineStore((state) => state.lastError);

  // アニメーション用
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [bannerState, setBannerState] = useState<BannerState>('hidden');

  // 表示状態の決定
  useEffect(() => {
    let newState: BannerState = 'hidden';

    if (!isOnline) {
      newState = 'offline';
    } else if (isProcessing) {
      newState = 'syncing';
    } else if (lastError) {
      newState = 'syncError';
    }

    setBannerState(newState);

    // アニメーション
    if (newState !== 'hidden') {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [isOnline, isProcessing, lastError, fadeAnim]);

  // 非表示時はレンダリングしない
  if (bannerState === 'hidden') {
    return null;
  }

  // バナーの内容を決定
  const getBannerContent = () => {
    switch (bannerState) {
      case 'offline':
        if (pendingCount > 0) {
          return {
            icon: '📴',
            text: t('network', 'offlineWithCount').replace('{{count}}', String(pendingCount)),
            style: styles.offlineBanner
          };
        }
        return {
          icon: '📴',
          text: t('network', 'offline'),
          style: styles.offlineBanner
        };
      case 'syncing':
        return {
          icon: '🔄',
          text: t('network', 'syncing'),
          style: styles.syncingBanner
        };
      case 'syncError':
        return {
          icon: '⚠️',
          text: t('network', 'syncError'),
          style: styles.errorBanner
        };
      default:
        return null;
    }
  };

  const content = getBannerContent();
  if (!content) return null;

  return (
    <Animated.View style={[styles.container, content.style, { opacity: fadeAnim }]}>
      <Text style={styles.icon}>{content.icon}</Text>
      <Text style={styles.text}>{content.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  offlineBanner: {
    backgroundColor: '#374151' // グレー
  },
  syncingBanner: {
    backgroundColor: '#1e40af' // 青
  },
  errorBanner: {
    backgroundColor: '#991b1b' // 赤
  },
  icon: {
    fontSize: 16,
    marginRight: 8
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500'
  }
});
