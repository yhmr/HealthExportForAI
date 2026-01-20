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
import { useAuth } from '../src/contexts/AuthContext';
import { AuthCheckModal } from '../src/components/AuthCheckModal';
import { useHealthStore } from '../src/stores/healthStore';
import { formatDateTime } from '../src/utils/formatters';
import { loadExportPeriodDays, saveExportPeriodDays } from '../src/services/config/exportConfig';
import { useLanguage } from '../src/contexts/LanguageContext';
import { NetworkStatusBanner } from '../src/components/NetworkStatusBanner';

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
        clearUploadError,
    } = useGoogleDrive();

    // 認証状態
    const { isAuthenticated, isInitialized: isAuthInitialized, signIn: authSignIn } = useAuth();

    // 認証チェックモーダルの表示状態
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);

    // ストアから選択状態とアクションを取得
    const { selectedDataTags, toggleDataTag } = useHealthStore();

    // 取得期間
    const [periodDays, setPeriodDays] = useState(DEFAULT_PERIOD_DAYS);

    // 翻訳
    const { t } = useLanguage();

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

    // 認証状態が初期化された後、未認証ならモーダルを表示
    useEffect(() => {
        if (isAuthInitialized && !isAuthenticated) {
            setShowAuthModal(true);
        }
    }, [isAuthInitialized, isAuthenticated]);

    // モーダルからのサインイン処理
    const handleAuthModalSignIn = async () => {
        setIsSigningIn(true);
        const success = await authSignIn();
        setIsSigningIn(false);
        if (success) {
            setShowAuthModal(false);
        }
    };

    // エラー表示
    useEffect(() => {
        if (error) {
            Alert.alert(t('common', 'error'), error);
        }
        if (uploadError) {
            Alert.alert(
                t('home', 'uploadError'),
                uploadError,
                [
                    {
                        text: 'OK',
                        onPress: () => clearUploadError(),
                    },
                ]
            );
        }
    }, [error, uploadError, clearUploadError]);

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
        const result = await exportAndUpload(selectedDataTags);
        if (result.success) {
            if (result.queued) {
                // オフラインキューに追加された場合
                Alert.alert(t('common', 'success'), t('network', 'pendingItems').replace('{{count}}', '1'));
            } else {
                Alert.alert(t('common', 'success'), t('home', 'exportSuccess'));
            }
        }
    };

    // データが取得済みかどうか
    const hasData = Object.values(healthData).some(
        (arr) => Array.isArray(arr) && arr.length > 0
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* 認証チェックモーダル */}
            <AuthCheckModal
                visible={showAuthModal}
                isSigningIn={isSigningIn}
                onSkip={() => setShowAuthModal(false)}
                onSignIn={handleAuthModalSignIn}
            />

            <Header title={t('home', 'title')} />

            {/* ネットワーク状態バナー */}
            <NetworkStatusBanner />

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {/* ステータス表示 */}
                {!isAvailable && (
                    <View style={styles.warningBanner}>
                        <Text style={styles.warningText}>
                            ⚠️ {t('home', 'healthConnectUnavailable')}
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
                        label={t('home', 'syncButton')}
                        icon="🔄"
                        variant="primary"
                    />
                    {lastSyncTime && (
                        <Text style={styles.lastSync}>
                            {t('home', 'lastSync')} {formatDateTime(lastSyncTime)}
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
                            {t('home', 'emptyState1')}{'\n'}
                            {t('home', 'emptyState2')}
                        </Text>
                    </View>
                )}

                {/* エクスポートボタン */}
                <View style={styles.exportSection}>
                    <SyncButton
                        onPress={handleExport}
                        isLoading={isUploading}
                        label={t('home', 'exportButton')}
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
