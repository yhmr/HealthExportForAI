// 設定画面（認証統合版）

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGoogleDrive } from '../src/hooks/useGoogleDrive';
import {
    loadExportPeriodDays,
    saveExportPeriodDays,
} from '../src/services/storage';
import type { DriveConfig } from '../src/config/driveConfig';

export default function SettingsScreen() {
    const router = useRouter();
    const {
        driveConfig,
        loadConfig,
        saveConfig,
        isAuthenticated,
        currentUser,
        authError,
        signIn,
        signOut,
    } = useGoogleDrive();

    const [clientId, setClientId] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [folderId, setFolderId] = useState('');
    const [periodDays, setPeriodDays] = useState('7');

    // 設定を読み込み
    useEffect(() => {
        const load = async () => {
            const config = await loadConfig();
            if (config) {
                setClientId(config.clientId || '');
                setAccessToken(config.accessToken);
                setFolderId(config.folderId);
            }
            const days = await loadExportPeriodDays();
            setPeriodDays(days.toString());
        };
        load();
    }, [loadConfig]);

    // 認証エラー表示
    useEffect(() => {
        if (authError) {
            Alert.alert('認証エラー', authError);
        }
    }, [authError]);

    // 保存ハンドラ
    const handleSave = async () => {
        const config: DriveConfig = {
            clientId,
            accessToken,
            folderId,
        };
        await saveConfig(config);

        const days = parseInt(periodDays, 10);
        if (!isNaN(days) && days > 0) {
            await saveExportPeriodDays(days);
        }

        Alert.alert('保存完了', '設定を保存しました', [
            { text: 'OK', onPress: () => router.back() },
        ]);
    };

    // サインインハンドラ
    const handleSignIn = async () => {
        if (!clientId) {
            Alert.alert('エラー', 'Web Client IDを先に入力して保存してください');
            return;
        }

        // 一旦設定を保存してからサインイン
        const config: DriveConfig = { clientId, accessToken, folderId };
        await saveConfig(config);

        await signIn();
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* ヘッダー */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backButton}>← 戻る</Text>
                </TouchableOpacity>
                <Text style={styles.title}>設定</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content}>
                {/* Google認証 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Googleアカウント</Text>

                    {isAuthenticated && currentUser ? (
                        <View style={styles.authInfo}>
                            <Text style={styles.authEmail}>
                                ✅ {currentUser.user.email}
                            </Text>
                            <TouchableOpacity
                                style={styles.signOutButton}
                                onPress={signOut}
                            >
                                <Text style={styles.signOutText}>サインアウト</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.signInButton}
                            onPress={handleSignIn}
                        >
                            <Text style={styles.signInText}>🔐 Googleでサインイン</Text>
                        </TouchableOpacity>
                    )}

                    <Text style={styles.label}>Web Client ID</Text>
                    <TextInput
                        style={styles.input}
                        value={clientId}
                        onChangeText={setClientId}
                        placeholder="xxx.apps.googleusercontent.com"
                        placeholderTextColor="#666"
                    />
                    <Text style={styles.hint}>
                        💡 Google Cloud Console → 認証情報 → OAuth 2.0 クライアント ID → ウェブ アプリケーション
                    </Text>
                </View>

                {/* Google Drive設定 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Google Drive</Text>

                    <Text style={styles.label}>フォルダID</Text>
                    <TextInput
                        style={styles.input}
                        value={folderId}
                        onChangeText={setFolderId}
                        placeholder="1ABC123..."
                        placeholderTextColor="#666"
                    />
                    <Text style={styles.hint}>
                        💡 Google DriveのフォルダURLの末尾部分
                    </Text>
                </View>

                {/* 手動トークン（フォールバック） */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>手動設定（オプション）</Text>
                    <Text style={styles.subHint}>
                        Googleサインインが使えない場合のみ
                    </Text>

                    <Text style={styles.label}>アクセストークン</Text>
                    <TextInput
                        style={styles.input}
                        value={accessToken}
                        onChangeText={setAccessToken}
                        placeholder="ya29.xxx..."
                        placeholderTextColor="#666"
                        multiline
                        numberOfLines={2}
                    />
                </View>

                {/* エクスポート設定 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>エクスポート設定</Text>

                    <Text style={styles.label}>期間（日数）</Text>
                    <TextInput
                        style={styles.input}
                        value={periodDays}
                        onChangeText={setPeriodDays}
                        placeholder="7"
                        placeholderTextColor="#666"
                        keyboardType="number-pad"
                    />
                </View>

                {/* 保存ボタン */}
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>設定を保存</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#1a1a2e',
    },
    backButton: {
        color: '#6366f1',
        fontSize: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    placeholder: {
        width: 50,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 12,
    },
    subHint: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        color: '#a0a0b0',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#1e1e2e',
        borderRadius: 8,
        padding: 12,
        color: '#ffffff',
        fontSize: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#2e2e3e',
    },
    hint: {
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 18,
        marginBottom: 8,
    },
    authInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1e1e2e',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    authEmail: {
        color: '#10b981',
        fontSize: 14,
        flex: 1,
    },
    signInButton: {
        backgroundColor: '#4285f4',
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        marginBottom: 16,
    },
    signInText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    signOutButton: {
        backgroundColor: '#ef4444',
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    signOutText: {
        color: '#ffffff',
        fontSize: 12,
    },
    saveButton: {
        backgroundColor: '#6366f1',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 32,
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
