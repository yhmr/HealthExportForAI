// ルートレイアウト

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';

export default function RootLayout() {
    return (
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
    );
}
