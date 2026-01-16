// 設定画面

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
    const { driveConfig, loadConfig, saveConfig } = useGoogleDrive();

    const [accessToken, setAccessToken] = useState('');
    const [folderId, setFolderId] = useState('');
    const [periodDays, setPeriodDays] = useState('7');

    // 設定を読み込み
    useEffect(() => {
        const load = async () => {
            const config = await loadConfig();
            if (config) {
                setAccessToken(config.accessToken);
                setFolderId(config.folderId);
            }
            const days = await loadExportPeriodDays();
            setPeriodDays(days.toString());
        };
        load();
    }, [loadConfig]);

    // 保存ハンドラ
    const handleSave = async () => {
        const config: DriveConfig = {
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
                {/* Google Drive設定 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Google Drive API</Text>

                    <Text style={styles.label}>アクセストークン</Text>
                    <TextInput
                        style={styles.input}
                        value={accessToken}
                        onChangeText={setAccessToken}
                        placeholder="ya29.xxx..."
                        placeholderTextColor="#666"
                        multiline
                        numberOfLines={3}
                    />

                    <Text style={styles.label}>フォルダID</Text>
                    <TextInput
                        style={styles.input}
                        value={folderId}
                        onChangeText={setFolderId}
                        placeholder="1ABC123..."
                        placeholderTextColor="#666"
                    />

                    <Text style={styles.hint}>
                        💡 Google Cloud ConsoleでOAuth 2.0を設定し、
                        OAuth 2.0 Playgroundでトークンを取得してください
                    </Text>
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
        marginBottom: 16,
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
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2e2e3e',
    },
    hint: {
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 18,
    },
    saveButton: {
        backgroundColor: '#6366f1',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
