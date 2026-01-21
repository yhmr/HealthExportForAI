// ルートレイアウト

import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider } from '../src/contexts/AuthContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { useOfflineSync } from '../src/hooks/useOfflineSync';

// バックグラウンドタスクをグローバルスコープで定義
// このimportによりTaskManager.defineTaskが実行される
import '../src/services/background/scheduler';
import { syncBackgroundTask } from '../src/services/background/scheduler';
import { loadBackgroundSyncConfig } from '../src/services/config/backgroundSyncConfig';

Sentry.init({
  dsn: 'https://9cbd9eeaca1880f9a2f5ec4367245444@o4510736582770688.ingest.us.sentry.io/4510736586506240',
  sendDefaultPii: true,
  enableLogs: true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration()]
});

export default Sentry.wrap(function RootLayout() {
  // オフライン同期の初期化・ネットワーク監視を開始
  useOfflineSync();

  // バックグラウンド同期タスクを設定に基づいて初期化
  useEffect(() => {
    const initBackgroundTask = async () => {
      try {
        const config = await loadBackgroundSyncConfig();
        await syncBackgroundTask(config);
      } catch (error) {
        console.error('[RootLayout] Failed to sync background task:', error);
      }
    };
    initBackgroundTask();
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0f0f1a' }
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="settings" />
        </Stack>
      </AuthProvider>
    </LanguageProvider>
  );
});
