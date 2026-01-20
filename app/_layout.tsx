// ルートレイアウト

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { useOfflineSync } from '../src/hooks/useOfflineSync';
import * as Sentry from '@sentry/react-native';

Sentry.init({
    dsn: 'https://9cbd9eeaca1880f9a2f5ec4367245444@o4510736582770688.ingest.us.sentry.io/4510736586506240',
    sendDefaultPii: true,
    enableLogs: true,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
    integrations: [Sentry.mobileReplayIntegration()],
});

export default Sentry.wrap(function RootLayout() {
    // オフライン同期の初期化・ネットワーク監視を開始
    useOfflineSync();

    return (
        <LanguageProvider>
            <AuthProvider>
                <StatusBar style="light" />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: '#0f0f1a' },
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="settings" />
                </Stack>
            </AuthProvider>
        </LanguageProvider>
    );
});
