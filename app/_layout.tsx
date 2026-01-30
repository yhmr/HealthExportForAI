// ルートレイアウト

import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider } from '../src/contexts/AuthContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { useOfflineSync } from '../src/hooks/useOfflineSync';

// バックグラウンドタスクをグローバルスコープで定義
// このimportによりTaskManager.defineTaskが実行される
import '../src/services/background/scheduler';
import { syncBackgroundTask } from '../src/services/background/scheduler';
import { backgroundSyncConfigService } from '../src/services/config/BackgroundSyncConfigService';

if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    sendDefaultPii: true,
    enableLogs: true,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
    integrations: [Sentry.mobileReplayIntegration()]
  });
}

function RootLayoutContent() {
  const { colors, activeThemeMode } = useTheme();

  return (
    <AuthProvider>
      <StatusBar
        style={activeThemeMode === 'dark' ? 'light' : 'dark'}
        backgroundColor={colors.background}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background }
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="settings" />
      </Stack>
    </AuthProvider>
  );
}

export default Sentry.wrap(function RootLayout() {
  // オフライン同期の初期化・ネットワーク監視を開始
  useOfflineSync();

  // バックグラウンド同期タスクを設定に基づいて初期化
  // タスクキル後の再起動時はネイティブモジュールが未初期化の場合があるため、
  // 遅延とリトライを追加
  useEffect(() => {
    const initBackgroundTask = async (retryCount = 0) => {
      const MAX_RETRIES = 3;
      const RETRY_DELAY_MS = 1000;

      try {
        const config = await backgroundSyncConfigService.loadBackgroundSyncConfig();
        await syncBackgroundTask(config);
      } catch (error) {
        console.error('[RootLayout] Failed to sync background task:', error);

        // リトライ
        if (retryCount < MAX_RETRIES) {
          console.log(
            `[RootLayout] Retrying in ${RETRY_DELAY_MS}ms... (${retryCount + 1}/${MAX_RETRIES})`
          );
          setTimeout(() => initBackgroundTask(retryCount + 1), RETRY_DELAY_MS);
        }
      }
    };

    // 初期化を少し遅延させる（ネイティブモジュール初期化待ち）
    const timer = setTimeout(() => initBackgroundTask(), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </LanguageProvider>
  );
});
