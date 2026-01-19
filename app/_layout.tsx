// ルートレイアウト

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://9cbd9eeaca1880f9a2f5ec4367245444@o4510736582770688.ingest.us.sentry.io/4510736586506240',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

export default Sentry.wrap(function RootLayout() {
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