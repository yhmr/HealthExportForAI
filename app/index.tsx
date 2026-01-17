// ホーム画面

import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../src/components/Header';
import { DataCard } from '../src/components/DataCard';
import { SyncButton } from '../src/components/SyncButton';
import { useHealthConnect } from '../src/hooks/useHealthConnect';
import { useGoogleDrive } from '../src/hooks/useGoogleDrive';
import { formatNumber, formatDuration, formatDateTime } from '../src/utils/formatters';

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
        driveConfig,
        loadConfig,
        isConfigValid,
        exportAndUpload,
    } = useGoogleDrive();

    // 初期化
    useEffect(() => {
        const setup = async () => {
            await initialize();
            await loadConfig();
        };
        setup();
    }, [initialize, loadConfig]);

    // エラー表示
    useEffect(() => {
        if (error) {
            Alert.alert('エラー', error);
        }
        if (uploadError) {
            Alert.alert('アップロードエラー', uploadError);
        }
    }, [error, uploadError]);

    // 同期ハンドラ
    const handleSync = async () => {
        if (!isInitialized) {
            const success = await initialize();
            if (!success) return;
        }

        if (!hasPermissions) {
            const granted = await requestPermissions();
            if (!granted) return;
        }

        await syncData();
    };

    // エクスポートハンドラ
    const handleExport = async () => {
        if (!isConfigValid()) {
            Alert.alert(
                '設定が必要',
                'Google Drive APIの設定を行ってください',
                [{ text: 'OK' }]
            );
            return;
        }

        const success = await exportAndUpload();
        if (success) {
            Alert.alert('成功', 'データをGoogle Driveにエクスポートしました');
        }
    };

    // 最新データを取得するヘルパー
    const getLatestValue = <T extends { date: string }>(
        data: T[],
        getValue: (item: T) => string
    ): string => {
        if (data.length === 0) return '-';
        const sorted = [...data].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        return getValue(sorted[0]);
    };

    // 値の集計
    const totalSteps = healthData.steps.reduce((sum, s) => sum + s.count, 0);
    const latestWeight = getLatestValue(healthData.weight, (w) => w.value.toFixed(1));
    const latestBodyFat = getLatestValue(healthData.bodyFat, (b) => b.percentage.toFixed(1));
    const totalCalories = healthData.totalCaloriesBurned.reduce((sum, c) => sum + c.value, 0);
    const latestBmr = getLatestValue(healthData.basalMetabolicRate, (b) => b.value.toString());
    const totalSleepMinutes = healthData.sleep.reduce((sum, s) => sum + s.durationMinutes, 0);

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

                {/* データカード */}
                <View style={styles.cardGrid}>
                    <DataCard
                        title="歩数"
                        value={formatNumber(totalSteps)}
                        unit="歩"
                        icon="👟"
                    />
                    <DataCard
                        title="体重"
                        value={latestWeight}
                        unit="kg"
                        icon="⚖️"
                    />
                    <DataCard
                        title="カロリー"
                        value={formatNumber(Math.round(totalCalories))}
                        unit="kcal"
                        icon="🔥"
                    />
                    <DataCard
                        title="睡眠"
                        value={formatDuration(totalSleepMinutes)}
                        icon="😴"
                    />
                    <DataCard
                        title="体脂肪"
                        value={latestBodyFat}
                        unit="%"
                        icon="📊"
                    />
                    <DataCard
                        title="基礎代謝"
                        value={latestBmr}
                        unit="kcal"
                        icon="💪"
                    />
                </View>

                {/* メタ情報 */}
                <View style={styles.metaInfo}>
                    {lastSyncTime && (
                        <Text style={styles.lastSync}>
                            最終同期: {formatDateTime(lastSyncTime)}
                        </Text>
                    )}
                    {healthData.exercise.length > 0 && (
                        <Text style={styles.extraInfo}>
                            運動: {healthData.exercise.length}件
                        </Text>
                    )}
                    {healthData.nutrition.length > 0 && (
                        <Text style={styles.extraInfo}>
                            栄養: {healthData.nutrition.length}件
                        </Text>
                    )}
                </View>

                {/* アクションボタン */}
                <View style={styles.actions}>
                    <SyncButton
                        onPress={handleSync}
                        isLoading={isLoading}
                        label="データを同期"
                        icon="🔄"
                        variant="primary"
                    />
                    <SyncButton
                        onPress={handleExport}
                        isLoading={isUploading}
                        label="Driveにエクスポート"
                        icon="☁️"
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
    cardGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 10,
        justifyContent: 'center',
    },
    metaInfo: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    lastSync: {
        color: '#6b7280',
        fontSize: 14,
        textAlign: 'center',
    },
    extraInfo: {
        color: '#4b5563',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 4,
    },
    actions: {
        marginTop: 16,
    },
});
