// ホーム画面

import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../src/components/Header';
import { StatusCard } from '../src/components/Home/StatusCard';
import { NetworkStatusBanner } from '../src/components/NetworkStatusBanner';
import { SyncButton } from '../src/components/SyncButton';
import { useAuth } from '../src/contexts/AuthContext';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { useGoogleDrive } from '../src/hooks/useGoogleDrive';
import { useHealthConnect } from '../src/hooks/useHealthConnect';
import { loadBackgroundSyncConfig } from '../src/services/config/backgroundSyncConfig';
import { loadIsSetupCompleted } from '../src/services/config/exportConfig';
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

  // 取得期間（UIからは削除されたが、設定読み込みなどで使う可能性があれば残すが、Hooks側で管理するので不要）
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [isSetupCompleted, setIsSetupCompleted] = useState(false);

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
        const [initResult, configResult, setupCompletedResult] = await Promise.all([
          !isInitialized ? initialize() : Promise.resolve(true),
          loadConfig(),
          loadIsSetupCompleted()
        ]);

        if (!isMounted) return;

        // Health Connectの権限状態を直接チェック
        const currentHealthPermissions = initResult ? await checkHealthPermissions() : false;

        // 設定の反映
        if (setupCompletedResult) {
          setIsSetupCompleted(true);
        }

        // UI設定の読み込み
        const bgConfig = await loadBackgroundSyncConfig();
        setAutoSyncEnabled(bgConfig.enabled);

        console.log('[HomeScreen] Setup completed');

        // オンボーディング判定
        const needsOnboarding =
          !isAuthenticated ||
          (initResult && !currentHealthPermissions) ||
          !configResult ||
          !setupCompletedResult;

        console.log('[HomeScreen] Check Onboarding:', {
          isAuthenticated,
          initResult,
          currentHealthPermissions,
          hasConfig: !!configResult,
          isSetupCompleted: setupCompletedResult,
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

  // 統合ハンドラ: 同期してエクスポート
  const handleSyncAndExport = async () => {
    if (!isInitialized) {
      const success = await initialize();
      if (!success) return;
    }

    if (!hasPermissions) {
      const granted = await requestPermissions();
      if (!granted) return;
    }

    // 1. 同期
    const syncSuccess = await syncData(); // 引数なしで差分更新または設定値に基づく初期取得
    if (!syncSuccess) return;

    // 2. アップロード
    const result = await exportAndUpload(selectedDataTags);
    if (result.success) {
      if (result.queued) {
        Alert.alert(t('common', 'success'), t('network', 'pendingItems').replace('{{count}}', '1'));
      } else {
        Alert.alert(t('common', 'success'), t('home', 'exportSuccess'));
      }
    }
  };

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
          isSetupCompleted={isSetupCompleted}
          autoSyncEnabled={autoSyncEnabled}
          t={t}
          language={language as 'ja' | 'en'}
        />

        {/* Main Actions */}
        <View style={styles.syncButtons}>
          <SyncButton
            onPress={handleSyncAndExport}
            isLoading={isLoading || isUploading}
            label={t('home', 'exportButton')} // "Sync & Export" 的な文言に変えるべきだが、一旦既存キーを使用
            icon="📤"
            variant="primary" // メインアクションなのでPrimaryに
          />
        </View>
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
