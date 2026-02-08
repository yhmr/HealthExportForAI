import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { type ExportFormat } from '../config/driveConfig';
import { useLanguage } from '../contexts/LanguageContext';
import { useGoogleDrive } from '../hooks/useGoogleDrive';
import { isBackgroundSyncRegistered, syncBackgroundTask } from '../services/background/scheduler';
import { backgroundSyncConfigService } from '../services/config/BackgroundSyncConfigService';
import { exportConfigService } from '../services/config/ExportConfigService';
import { clearDebugLogs, loadDebugLogs, type DebugLogEntry } from '../services/debugLogService';
import { healthService } from '../services/health/healthAdapterFactory';
import { DEFAULT_FOLDER_NAME } from '../services/storage/googleDrive';
import { type AutoSyncConfig, type SyncInterval } from '../types/export';
import { shouldRequestNotificationPermission } from './useSettingsPolicy';

export function useSettings() {
  const {
    loadConfig,
    saveConfig,
    isAuthenticated,
    currentUser,
    signIn,
    signOut,
    resolveAndSaveFolder
  } = useGoogleDrive();
  const { t, language, setLanguage } = useLanguage();
  const isIOS = Platform.OS === 'ios';

  const [isLoading, setIsLoading] = useState(true);
  const [folderId, setFolderId] = useState('');
  const [folderName, setFolderName] = useState('');
  const [exportFormats, setExportFormats] = useState<ExportFormat[]>(['googleSheets']);
  const [exportSheetAsPdf, setExportSheetAsPdf] = useState(false);
  const [periodDays, setPeriodDays] = useState(30);

  // 自動同期設定
  const [autoSyncConfig, setAutoSyncConfigState] = useState<AutoSyncConfig>({
    enabled: false,
    intervalMinutes: 1440,
    wifiOnly: true
  });
  const [lastBackgroundSync, setLastBackgroundSync] = useState<string | null>(null);

  // デバッグログ
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  // ログ読み込み
  const refreshLogs = useCallback(async () => {
    const logs = await loadDebugLogs();
    setDebugLogs(logs);
  }, []);

  // 設定読み込み
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const config = await loadConfig();
        const formats = await exportConfigService.loadExportFormats();
        const pdfOption = await exportConfigService.loadExportSheetAsPdf();
        const days = await exportConfigService.loadExportPeriodDays();
        const syncConfig = await backgroundSyncConfigService.loadBackgroundSyncConfig();
        const lastSync = await backgroundSyncConfigService.loadLastBackgroundSync();
        const logs = await loadDebugLogs();

        if (!mounted) return;

        setExportFormats(formats);
        setExportSheetAsPdf(pdfOption);
        setPeriodDays(days);
        setAutoSyncConfigState(syncConfig);
        setLastBackgroundSync(lastSync);
        setDebugLogs(logs);

        // フォルダ設定
        // IDがある場合は解決・保存を試みる
        const currentFolderId = config?.folderId || '';
        const currentFolderName = config?.folderName || '';

        let resolvedName = currentFolderName;
        if (currentFolderId && !currentFolderName) {
          resolvedName = await resolveAndSaveFolder(currentFolderId);
        } else if (!currentFolderId) {
          resolvedName = DEFAULT_FOLDER_NAME;
        }

        setFolderId(currentFolderId);
        setFolderName(resolvedName || DEFAULT_FOLDER_NAME);
      } catch (error) {
        console.error('[useSettings] Load config error:', error);
        if (mounted) setFolderName(DEFAULT_FOLDER_NAME);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [loadConfig, resolveAndSaveFolder]);

  // アクション: サインイン
  const handleSignIn = async () => {
    await signIn();
  };

  // アクション: エクスポート形式変更
  const toggleExportFormat = async (format: ExportFormat) => {
    const newFormats = exportFormats.includes(format)
      ? exportFormats.filter((f) => f !== format)
      : [...exportFormats, format];
    setExportFormats(newFormats);
    await exportConfigService.saveExportFormats(newFormats);
  };

  // アクション: PDFオプション変更
  const togglePdfOption = async () => {
    const newValue = !exportSheetAsPdf;
    setExportSheetAsPdf(newValue);
    await exportConfigService.saveExportSheetAsPdf(newValue);
  };

  // アクション: 自動同期トグル
  const toggleAutoSync = async (enabled: boolean) => {
    try {
      const previousConfig = autoSyncConfig;

      if (enabled) {
        // 1. Google認証チェック
        if (!isAuthenticated || !currentUser) {
          Alert.alert(t('common', 'error'), t('settings', 'authRequired'), [{ text: 'OK' }]);
          return;
        }

        // 2. ヘルスケア権限チェック
        const hasPermissions = await healthService.hasPermissions();
        if (!hasPermissions.unwrapOr(false)) {
          Alert.alert(t('settings', 'permissionRequired'), t('onboarding', 'permissionRequired'), [
            {
              text: t('settings', 'openHealthConnect'),
              onPress: () => healthService.openDataManagement()
            },
            { text: 'OK', style: 'cancel' }
          ]);
          return;
        }

        // 3. 通知権限チェック（通知を利用するAndroidのみ）
        if (shouldRequestNotificationPermission(Platform.OS)) {
          const settings = await notifee.requestPermission();
          if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
            Alert.alert(
              t('settings', 'permissionRequired'),
              t('settings', 'notificationPermissionDesc'),
              [
                {
                  text: t('settings', 'openHealthConnect'),
                  onPress: () => Linking.openSettings()
                },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
            return; // 通知権限がない場合はONにしない
          }
        }

        // 4. バックグラウンド権限 (Android) / 配信登録 (iOS)
        const bgResult = await healthService.requestBackgroundPermission();
        const bgGranted = bgResult.unwrapOr(false);
        if (!bgGranted) {
          Alert.alert(
            t('settings', 'permissionRequired'),
            t('settings', 'backgroundPermissionRequired'),
            [
              {
                text: t('settings', 'openHealthConnect'),
                onPress: () => healthService.openDataManagement()
              },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          return;
        }
      }

      const newConfig = { ...autoSyncConfig, enabled };
      setAutoSyncConfigState(newConfig);
      await backgroundSyncConfigService.saveBackgroundSyncConfig(newConfig);
      const syncApplied = await syncBackgroundTask(newConfig);

      // 実際にタスク登録/解除ができなかった場合、UIと保存状態を元に戻す。
      if (!syncApplied) {
        setAutoSyncConfigState(previousConfig);
        await backgroundSyncConfigService.saveBackgroundSyncConfig(previousConfig);
        Alert.alert(t('common', 'error'), t('settings', 'backgroundSyncApplyFailed'));
        await refreshLogs();
        return;
      }

      // ON時は「登録済みか」を最終確認し、登録失敗なら元に戻す。
      if (enabled) {
        const registered = await isBackgroundSyncRegistered();
        if (!registered) {
          setAutoSyncConfigState(previousConfig);
          await backgroundSyncConfigService.saveBackgroundSyncConfig(previousConfig);
          Alert.alert(
            t('settings', 'permissionRequired'),
            t('settings', 'backgroundSyncUnavailable')
          );
          await refreshLogs();
          return;
        }
      }

      await refreshLogs();
    } catch (error) {
      console.error('[toggleAutoSync] Error:', error);
      Alert.alert(t('common', 'error'), String(error));
    }
  };

  // アクション: 同期間隔変更
  const changeSyncInterval = async (interval: SyncInterval) => {
    // iOS はOS主導で実行タイミングが決まるため、アプリ側の間隔変更は受け付けない
    if (isIOS) return;

    const previousConfig = autoSyncConfig;
    const newConfig = { ...autoSyncConfig, intervalMinutes: interval };
    setAutoSyncConfigState(newConfig);
    await backgroundSyncConfigService.saveBackgroundSyncConfig(newConfig);
    const syncApplied = await syncBackgroundTask(newConfig);
    if (!syncApplied) {
      setAutoSyncConfigState(previousConfig);
      await backgroundSyncConfigService.saveBackgroundSyncConfig(previousConfig);
      Alert.alert(t('common', 'error'), t('settings', 'backgroundSyncApplyFailed'));
      await refreshLogs();
      return;
    }
    await refreshLogs();
  };

  // アクション: Wi-Fi設定変更
  const toggleWifiOnly = async (wifiOnly: boolean) => {
    const newConfig = { ...autoSyncConfig, wifiOnly };
    setAutoSyncConfigState(newConfig);
    await backgroundSyncConfigService.saveBackgroundSyncConfig(newConfig);
  };

  // アクション: ログクリア
  const clearLogs = async () => {
    await clearDebugLogs();
    await refreshLogs();
  };

  // アクション: フォルダ更新
  const updateFolder = async (id: string, name: string) => {
    setFolderId(id);
    setFolderName(name);
    await saveConfig({ folderId: id, folderName: name });
  };

  return {
    state: {
      isLoading,
      isAuthenticated,
      currentUser,
      folderId,
      folderName,
      exportFormats,
      exportSheetAsPdf,
      periodDays,
      autoSyncConfig,
      lastBackgroundSync,
      debugLogs,
      isDebugOpen,
      language
    },
    actions: {
      setLanguage,
      setIsDebugOpen,
      refreshLogs,
      handleSignIn,
      signOut,
      toggleExportFormat,
      togglePdfOption,
      toggleAutoSync,
      changeSyncInterval,
      toggleWifiOnly,
      clearLogs,
      updateFolder
    },
    t
  };
}
