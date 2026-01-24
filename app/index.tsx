// ホーム画面

import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DataTagList } from '../src/components/DataTagList';
import { Header } from '../src/components/Header';
import { StatusCard } from '../src/components/Home/StatusCard';
import { NetworkStatusBanner } from '../src/components/NetworkStatusBanner';
import { DEFAULT_PERIOD_DAYS, PeriodPicker } from '../src/components/PeriodPicker';
import { SyncButton } from '../src/components/SyncButton';
import { useAuth } from '../src/contexts/AuthContext';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { useGoogleDrive } from '../src/hooks/useGoogleDrive';
import { useHealthConnect } from '../src/hooks/useHealthConnect';
import { loadBackgroundSyncConfig } from '../src/services/config/backgroundSyncConfig';
import { loadExportPeriodDays, saveExportPeriodDays } from '../src/services/config/exportConfig';
import { checkHealthPermissions } from '../src/services/healthConnect';
import { useHealthStore } from '../src/stores/healthStore';
import { ThemeColors } from '../src/theme/types';

export default function HomeScreen() {
  const router = useRouter();
  const { driveConfig, isUploading, uploadError, loadConfig, exportAndUpload, clearUploadError } =
    useGoogleDrive();

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
    syncData
  } = useHealthConnect();

  // 認証状態
  const { isAuthenticated } = useAuth();

  // ストアから選択状態とアクションを取得
  const { selectedDataTags, toggleDataTag } = useHealthStore();

  // 取得期間
  const [periodDays, setPeriodDays] = useState(DEFAULT_PERIOD_DAYS);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);

  // 翻訳 & テーマ
  const { t, language } = useLanguage();
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // 初期化 & 画面フォーカス時に設定再読み込み
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const setup = async () => {
        console.log('[HomeScreen] Setup started');

        // 並列で初期化と設定読み込みを実行
        // initialize() は成否(boolean)を、loadConfig() は設定オブジェクト(DriveConfig | null)を返す
        const [initResult, configResult] = await Promise.all([
          !isInitialized ? initialize() : Promise.resolve(true),
          loadConfig()
        ]);

        if (!isMounted) return;

        // Health Connectの権限状態を直接チェック（State更新待ちを防ぐため）
        // initializeが成功している場合のみチェックを行う
        const currentHealthPermissions = initResult ? await checkHealthPermissions() : false;

        // UI設定の読み込み
        const savedDays = await loadExportPeriodDays();
        setPeriodDays(savedDays);
        const bgConfig = await loadBackgroundSyncConfig();
        setAutoSyncEnabled(bgConfig.enabled);

        console.log('[HomeScreen] Setup completed');

        // オンボーディング判定
        // 以下のいずれかの場合はオンボーディングへ誘導
        // 1. 未認証
        // 2. Health Connect初期化成功済みだが権限がない
        // 3. Drive設定がない

        const needsOnboarding =
          !isAuthenticated || (initResult && !currentHealthPermissions) || !configResult;

        console.log('[HomeScreen] Check Onboarding:', {
          isAuthenticated,
          initResult,
          currentHealthPermissions,
          hasConfig: !!configResult,
          needsOnboarding
        });

        if (needsOnboarding) {
          router.replace('/onboarding');
        }
      };

      setup();

      return () => {
        isMounted = false;
      };
    }, [initialize, loadConfig, isInitialized, isAuthenticated, router])
  );

  // エラー表示
  useEffect(() => {
    if (error) {
      Alert.alert(t('common', 'error'), error);
    }
    if (uploadError) {
      Alert.alert(t('home', 'uploadError'), uploadError, [
        {
          text: 'OK',
          onPress: () => clearUploadError()
        }
      ]);
    }
  }, [error, uploadError, clearUploadError, t]);

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
    const result = await exportAndUpload(selectedDataTags);
    if (result.success) {
      if (result.queued) {
        Alert.alert(t('common', 'success'), t('network', 'pendingItems').replace('{{count}}', '1'));
      } else {
        Alert.alert(t('common', 'success'), t('home', 'exportSuccess'));
      }
    }
  };

  const hasData = Object.values(healthData).some((arr) => Array.isArray(arr) && arr.length > 0);

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('home', 'title')} />
      <NetworkStatusBanner />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <StatusCard
          lastSyncTime={lastSyncTime}
          isHealthConnectConnected={isAvailable && hasPermissions}
          isDriveConnected={!!driveConfig}
          autoSyncEnabled={autoSyncEnabled}
          t={t}
          language={language as 'ja' | 'en'}
        />

        {/* Quick Actions Grid */}
        <View style={styles.actionGrid}>
          <View style={styles.actionItem}>
            <PeriodPicker value={periodDays} onChange={handlePeriodChange} />
          </View>
        </View>

        {/* Main Actions */}
        <View style={styles.syncButtons}>
          <SyncButton
            onPress={handleSync}
            isLoading={isLoading}
            label={t('home', 'syncButton')}
            icon="🔄"
            variant="primary"
          />
          <SyncButton
            onPress={handleExport}
            isLoading={isUploading}
            label={t('home', 'exportButton')}
            icon="📤"
            variant="secondary"
          />
        </View>

        {/* Data List */}
        {hasData ? (
          <View style={styles.dataSection}>
            <Text style={styles.sectionTitle}>Preview Data</Text>
            <DataTagList
              healthData={healthData}
              selectedTags={selectedDataTags}
              onToggleTag={toggleDataTag}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            {/* Empty state simplified as StatusCard shows status */}
            <Text style={styles.emptyText}>{t('home', 'emptyState1')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background
    },
    content: {
      flex: 1,
      paddingHorizontal: 16
    },
    scrollContent: {
      paddingBottom: 32,
      paddingTop: 16
    },
    actionGrid: {
      marginBottom: 16
    },
    actionItem: {
      marginBottom: 8
    },
    syncButtons: {
      gap: 12,
      marginBottom: 24
    },
    dataSection: {
      marginTop: 8
    },
    sectionTitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
      fontWeight: '600',
      textTransform: 'uppercase'
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 24
    },
    emptyText: {
      color: colors.textTertiary,
      fontSize: 14
    }
  });
