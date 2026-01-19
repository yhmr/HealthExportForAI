// ホーム画面

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Header } from '../src/components/Header';
import { DataTagList } from '../src/components/DataTagList';
import { SyncButton } from '../src/components/SyncButton';
import { PeriodPicker, DEFAULT_PERIOD_DAYS } from '../src/components/PeriodPicker';
import { useHealthConnect } from '../src/hooks/useHealthConnect';
import { useGoogleDrive } from '../src/hooks/useGoogleDrive';
import { useHealthStore } from '../src/stores/healthStore';
import { formatDateTime } from '../src/utils/formatters';
import { loadExportPeriodDays, saveExportPeriodDays } from '../src/services/preferences';

export default function HomeScreen() {
    const {
        isInitialized,
        isAvailable,
        hasPermissions,
        healthData,
        lastSyncTime,
        isLoading,
        error,
        initialize,
        requestPermissions,
        syncData,
    } = useHealthConnect();

    const {
        isUploading,
        uploadError,
        loadConfig,
        exportAndUpload,
    } = useGoogleDrive();

    // ストアから選択状態とアクションを取得
    const { selectedDataTags, toggleDataTag } = useHealthStore();

    // 取得期間
    const [periodDays, setPeriodDays] = useState(DEFAULT_PERIOD_DAYS);

    // 初期化 & 画面フォーカス時に設定再読み込み
    useFocusEffect(
        useCallback(() => {
            const setup = async () => {
                // Initializeは初回のみで良いが、Configは毎回最新にする
                if (!isInitialized) {
                    await initialize();
                }
                await loadConfig();
                // 保存された期間を読み込み
                const savedDays = await loadExportPeriodDays();
                setPeriodDays(savedDays);
            };
            setup();
        }, [initialize, loadConfig, isInitialized])
    );

    // エラー表示
    useEffect(() => {
        if (error) {
            Alert.alert('エラー', error);
        }
        if (uploadError) {
            Alert.alert('アップロードエラー', uploadError);
        }
    }, [error, uploadError]);

    // 期間変更ハンドラ
    const handlePeriodChange = async (days: number) => {
        setPeriodDays(days);
        await saveExportPeriodDays(days);
    };

    // データ取得ハンドラ
    const handleSync = async () => {
        if (!isInitialized) {
            const success = await initialize();
            if (!success) return;
        }

        if (!hasPermissions) {
            const granted = await requestPermissions();
            if (!granted) return;
        }

        await syncData(periodDays);
    };

    // エクスポートハンドラ
    const handleExport = async () => {
        // 選択されたタグをエクスポート関数に渡す
        const success = await exportAndUpload(selectedDataTags);
        if (success) {
            Alert.alert('成功', 'データをエクスポートしました');
        }
    };

    // データが取得済みかどうか
    const hasData = Object.values(healthData).some(
        (arr) => Array.isArray(arr) && arr.length > 0
    );

    return (
        <SafeAreaView style={styles.container}>
            <Header title="Health Export For AI" />

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {/* ステータス表示 */}
                {!isAvailable && (
                    <View style={styles.warningBanner}>
                        <Text style={styles.warningText}>
                            ⚠️ Health Connectが利用できません
                        </Text>
                    </View>
                )}

                {/* 期間選択 */}
                <PeriodPicker value={periodDays} onChange={handlePeriodChange} />

                {/* データ取得ボタン */}
                <View style={styles.syncSection}>
                    <SyncButton
                        onPress={handleSync}
                        isLoading={isLoading}
                        label="データを取得"
                        icon="🔄"
                        variant="primary"
                    />
                    {lastSyncTime && (
                        <Text style={styles.lastSync}>
                            最終取得: {formatDateTime(lastSyncTime)}
                        </Text>
                    )}
                </View>

                {/* データタグ一覧 */}
                {hasData ? (
                    <DataTagList
                        healthData={healthData}
                        selectedTags={selectedDataTags}
                        onToggleTag={toggleDataTag}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📊</Text>
                        <Text style={styles.emptyText}>
                            「データを取得」ボタンを押して{'\n'}
                            Health Connectからデータを取得してください
                        </Text>
                    </View>
                )}

                {/* エクスポートボタン */}
                <View style={styles.exportSection}>
                    <SyncButton
                        onPress={handleExport}
                        isLoading={isUploading}
                        label="エクスポート"
                        icon="📤"
                        variant="secondary"
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f1a',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 32,
    },
    warningBanner: {
        backgroundColor: '#f59e0b20',
        padding: 12,
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#f59e0b40',
    },
    warningText: {
        color: '#f59e0b',
        textAlign: 'center',
    },
    syncSection: {
        alignItems: 'center',
    },
    lastSync: {
        color: '#6b7280',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
        paddingHorizontal: 32,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyText: {
        color: '#6b7280',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
    exportSection: {
        marginTop: 24,
    },
});
