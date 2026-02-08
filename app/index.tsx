// ホーム画面

import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../src/components/Header';
import { ExportCircleButton } from '../src/components/Home/ExportCircleButton';
import { StatusCard } from '../src/components/Home/StatusCard';
import { WidgetTips } from '../src/components/Home/WidgetTips';
import { NetworkStatusBanner } from '../src/components/NetworkStatusBanner';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { useGoogleDrive } from '../src/hooks/useGoogleDrive';
import { useHealthService } from '../src/hooks/useHealthService';
import { useSyncOperation } from '../src/hooks/useSyncOperation';
import { backgroundSyncConfigService } from '../src/services/config/BackgroundSyncConfigService';
import { exportConfigService } from '../src/services/config/ExportConfigService';
import { ThemeColors } from '../src/theme/types';

export default function HomeScreen() {
  const router = useRouter();
  const { driveConfig, uploadError, loadConfig, clearUploadError, isAuthenticated } =
    useGoogleDrive();
  const {
    isInitialized,
    isAvailable,
    hasPermissions,
    lastSyncTime,
    isLoading,
    error,
    initialize,
    requestPermissions,
    checkPermissions
  } = useHealthService();

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
        // 並列で初期化と設定読み込みを実行
        const [initResult, , setupCompletedResult] = await Promise.all([
          !isInitialized ? initialize() : Promise.resolve(true),
          loadConfig(),
          exportConfigService.loadIsSetupCompleted()
        ]);

        if (!isMounted) return;

        // Health Connectの権限状態を再チェック (State更新)
        // 初期化成功時のみチェックを実行
        if (initResult) {
          await checkPermissions();
        }

        // 設定の反映
        if (setupCompletedResult) {
          setIsSetupCompleted(true);
        }

        // UI設定の読み込み
        const config = await backgroundSyncConfigService.loadBackgroundSyncConfig();
        setAutoSyncEnabled(config.enabled);

        // オンボーディング判定
        // 一度でもセットアップが完了していれば、権限や設定が欠けていても
        // メイン画面でアラート等を出す形にし、オンボーディングには戻さない
        const needsOnboarding = !setupCompletedResult;

        if (needsOnboarding) {
          router.replace('/onboarding');
        }
      };

      setup();

      return () => {
        isMounted = false;
      };
    }, [initialize, loadConfig, isInitialized, router, checkPermissions])
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

  // 同期操作Hook
  const { isSyncing: isOperationSyncing, triggerFullSync } = useSyncOperation();

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

    // Google認証チェック
    if (!isAuthenticated) {
      Alert.alert(t('common', 'error'), t('home', 'authRequired'));
      return;
    }

    // 新しい統合メソッドを使用
    const result = await triggerFullSync(); // 引数なしで差分更新または設定値に基づく初期取得

    if (result.success) {
      if (result.uploaded) {
        Alert.alert(t('common', 'success'), t('home', 'exportSuccess'));
      } else if (result.queued) {
        // オフライン等でキューに入っただけの場合
        Alert.alert(t('common', 'success'), t('network', 'pendingItems').replace('{{count}}', '1'));
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('home', 'title')} />
      <NetworkStatusBanner />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <View style={styles.statusSection}>
          <StatusCard
            lastSyncTime={lastSyncTime}
            isHealthServiceConnected={isAvailable && hasPermissions}
            isDriveConnected={!!driveConfig && isAuthenticated}
            isSetupCompleted={isSetupCompleted}
            autoSyncEnabled={autoSyncEnabled}
            t={t}
            language={language as 'ja' | 'en'}
          />
        </View>

        {/* Main Area: Button & Tips */}
        <View style={styles.mainContainer}>
          {/* Button Area (Center of remaining space) */}
          <View style={styles.buttonArea}>
            <ExportCircleButton
              onPress={handleSyncAndExport}
              isLoading={isLoading || isOperationSyncing}
              label={t('home', 'exportButton')}
            />
          </View>

          {/* Tips Area (Bottom/Below Button) */}
          <View style={styles.tipsArea}>
            <WidgetTips />
          </View>
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
      flex: 1
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32
    },
    statusSection: {
      marginBottom: 0
    },
    mainContainer: {
      flex: 1,
      flexDirection: 'column'
    },
    buttonArea: {
      flex: 3,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 250
    },
    tipsArea: {
      flex: 1,
      justifyContent: 'center',
      paddingBottom: 20
    }
  });
