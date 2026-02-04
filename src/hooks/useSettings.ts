import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { type ExportFormat } from '../config/driveConfig';
import { useLanguage } from '../contexts/LanguageContext';
import { useGoogleDrive } from '../hooks/useGoogleDrive';
import { syncBackgroundTask } from '../services/background/scheduler';
import { backgroundSyncConfigService } from '../services/config/BackgroundSyncConfigService';
import { exportConfigService } from '../services/config/ExportConfigService';
import { clearDebugLogs, loadDebugLogs, type DebugLogEntry } from '../services/debugLogService';
import {
  checkHealthPermissions,
  openHealthConnectDataManagement,
  requestBackgroundHealthPermission
} from '../services/healthConnect';
import { DEFAULT_FOLDER_NAME } from '../services/storage/googleDrive';
import { type AutoSyncConfig, type SyncInterval } from '../types/exportTypes';

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
      if (enabled && Platform.OS === 'android') {
        // 1. Google認証チェック
        if (!isAuthenticated || !currentUser) {
          Alert.alert(t('common', 'error'), t('settings', 'authRequired'), [{ text: 'OK' }]);
          return;
        }

        // 2. Health Connect権限チェック (Foreground)
        // UI上ではすでにチェックされているはずだが、念のため
        const hasPermissions = await checkHealthPermissions();
        if (!hasPermissions.unwrapOr(false)) {
          Alert.alert(t('settings', 'permissionRequired'), t('onboarding', 'permissionRequired'), [
            {
              text: t('settings', 'openHealthConnect'),
              onPress: () => openHealthConnectDataManagement()
            },
            { text: 'OK', style: 'cancel' }
          ]);
          return;
        }

        // 3. 通知権限チェック
        const settings = await notifee.requestPermission();
        if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
          Alert.alert(
            t('settings', 'permissionRequired'),
            t('settings', 'notificationPermissionDesc'),
            [
              {
                text: t('settings', 'openHealthConnect'), // "設定画面を開く"を再利用
                onPress: () => Linking.openSettings()
              },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          return; // 通知権限がない場合はONにしない
        }

        const bgResult = await requestBackgroundHealthPermission();
        const bgGranted = bgResult.unwrapOr(false);
        if (!bgGranted) {
          Alert.alert(
            t('settings', 'permissionRequired'),
            language === 'ja'
              ? '自動同期を使用するには、バックグラウンドでのデータ読み取り権限が必要です。'
              : 'Background data read permission is required to use auto sync.',
            [
              {
                text: t('settings', 'openHealthConnect'),
                onPress: () => openHealthConnectDataManagement()
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
      await syncBackgroundTask(newConfig);
      await refreshLogs();
    } catch (error) {
      console.error('[toggleAutoSync] Error:', error);
      Alert.alert(t('common', 'error'), String(error));
    }
  };

  // アクション: 同期間隔変更
  const changeSyncInterval = async (interval: SyncInterval) => {
    const newConfig = { ...autoSyncConfig, intervalMinutes: interval };
    setAutoSyncConfigState(newConfig);
    await backgroundSyncConfigService.saveBackgroundSyncConfig(newConfig);
    await syncBackgroundTask(newConfig);
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
