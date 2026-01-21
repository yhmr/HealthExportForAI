// 設定画面（認証統合版）

import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Hooks & Contexts
import { useLanguage } from '../src/contexts/LanguageContext';
import { useGoogleDrive } from '../src/hooks/useGoogleDrive';

// Services & Config
import { syncBackgroundTask } from '../src/services/background/scheduler';
import {
  getSyncIntervalLabel,
  loadBackgroundSyncConfig,
  loadLastBackgroundSync,
  saveBackgroundSyncConfig,
  SYNC_INTERVALS
} from '../src/services/config/backgroundSyncConfig';
import { saveDriveConfig } from '../src/services/config/driveConfig';
import {
  loadExportFormats,
  loadExportSheetAsPdf,
  saveExportFormats,
  saveExportSheetAsPdf
} from '../src/services/config/exportConfig';
import { clearDebugLogs, loadDebugLogs, type DebugLogEntry } from '../src/services/debugLogService';
import { getAccessToken } from '../src/services/googleAuth';
import { DEFAULT_FOLDER_NAME, getFolder } from '../src/services/storage/googleDrive';

// Components
import { ExportFormatCheckbox } from '../src/components/ExportFormatCheckbox';
import { FolderPickerModal } from '../src/components/FolderPickerModal';
import { LicenseModal } from '../src/components/LicenseModal';

// Types
import type { ExportFormat } from '../src/config/driveConfig';
import type { AutoSyncConfig, SyncInterval } from '../src/types/offline';

export default function SettingsScreen() {
  const router = useRouter();
  const { loadConfig, isAuthenticated, currentUser, authError, signIn, signOut } = useGoogleDrive();

  const [folderId, setFolderId] = useState('');
  const [folderName, setFolderName] = useState('');
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [isLicenseModalVisible, setLicenseModalVisible] = useState(false);
  const [exportFormats, setExportFormats] = useState<ExportFormat[]>(['googleSheets']);
  const [exportSheetAsPdf, setExportSheetAsPdf] = useState(false);

  // 自動同期設定
  const [autoSyncConfig, setAutoSyncConfigState] = useState<AutoSyncConfig>({
    enabled: false,
    intervalMinutes: 1440,
    wifiOnly: true
  });
  const [lastBackgroundSync, setLastBackgroundSync] = useState<string | null>(null);
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);

  // デバッグログ
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);

  // 翻訳
  const { t, language, setLanguage } = useLanguage();

  // ログ読み込みヘルパー
  const refreshLogs = async () => {
    const logs = await loadDebugLogs();
    setDebugLogs(logs);
  };

  // 設定を読み込み
  useEffect(() => {
    const load = async () => {
      try {
        const config = await loadConfig();
        const formats = await loadExportFormats();
        const pdfOption = await loadExportSheetAsPdf();
        setExportFormats(formats);
        setExportSheetAsPdf(pdfOption);

        // 自動同期設定を読み込み
        const syncConfig = await loadBackgroundSyncConfig();
        setAutoSyncConfigState(syncConfig);
        const lastSync = await loadLastBackgroundSync();
        setLastBackgroundSync(lastSync);

        await refreshLogs();

        // フォルダIDとフォルダ名を設定
        // 注意: フォルダIDが空の場合はエクスポート時にデフォルトフォルダが自動作成される
        const currentFolderId = config?.folderId || '';
        const currentFolderName = config?.folderName || '';

        setFolderId(currentFolderId);

        if (currentFolderId && currentFolderName) {
          // IDと名前が両方ある = そのまま表示
          setFolderName(currentFolderName);
        } else if (currentFolderId) {
          // IDはあるが名前がない = APIから取得を試みる
          const token = await getAccessToken();
          if (token) {
            const folder = await getFolder(currentFolderId, token);
            if (folder) {
              setFolderName(folder.name);
              // 設定を更新して保存
              await saveDriveConfig({ folderId: currentFolderId, folderName: folder.name });
            } else {
              // フォルダが見つからない = 削除された可能性があるのでリセット
              setFolderName(DEFAULT_FOLDER_NAME);
              setFolderId('');
              await saveDriveConfig({ folderId: '', folderName: '' });
            }
          } else {
            // 認証されていない = デフォルト名を暫定表示
            setFolderName(DEFAULT_FOLDER_NAME);
          }
        } else {
          // IDがない = デフォルトフォルダが使われる
          setFolderName(DEFAULT_FOLDER_NAME);
        }
      } catch (error) {
        console.error('[Settings] Load config error:', error);
        setFolderName(DEFAULT_FOLDER_NAME);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadConfig]);

  // 認証エラー表示
  useEffect(() => {
    if (authError) {
      Alert.alert(t('settings', 'authError'), authError);
    }
  }, [authError]);

  // サインインハンドラ
  const handleSignIn = async () => {
    await signIn();
  };

  // エクスポート形式のトグル
  const toggleExportFormat = async (format: ExportFormat) => {
    const newFormats = exportFormats.includes(format)
      ? exportFormats.filter((f) => f !== format)
      : [...exportFormats, format];
    setExportFormats(newFormats);
    await saveExportFormats(newFormats);
  };

  // 自動同期のON/OFFトグル
  const handleAutoSyncToggle = async (enabled: boolean) => {
    if (enabled && Platform.OS === 'android') {
      const settings = await notifee.requestPermission();
      if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
        Alert.alert(
          t('settings', 'permissionRequired'),
          t('settings', 'notificationPermissionDesc'),
          [{ text: 'OK', onPress: () => {} }]
        );
        return;
      }
    }

    const newConfig = { ...autoSyncConfig, enabled };
    setAutoSyncConfigState(newConfig);
    await saveBackgroundSyncConfig(newConfig);
    await syncBackgroundTask(newConfig);
    await refreshLogs(); // 設定変更時にログ更新
  };

  // 同期間隔の変更
  const handleIntervalChange = async (interval: SyncInterval) => {
    const newConfig = { ...autoSyncConfig, intervalMinutes: interval };
    setAutoSyncConfigState(newConfig);
    await saveBackgroundSyncConfig(newConfig);
    await syncBackgroundTask(newConfig);
    setShowIntervalPicker(false);
    await refreshLogs();
  };

  // Wi-Fiのみ同期のトグル
  const handleWifiOnlyToggle = async (wifiOnly: boolean) => {
    const newConfig = { ...autoSyncConfig, wifiOnly };
    setAutoSyncConfigState(newConfig);
    await saveBackgroundSyncConfig(newConfig);
  };

  // ログクリア
  const handleClearLogs = async () => {
    await clearDebugLogs();
    await refreshLogs();
  };

  // 戻るボタン押下時のバリデーション
  const handleBack = () => {
    if (exportFormats.length === 0) {
      Alert.alert(t('settings', 'warningTitle'), t('settings', 'noFormatSelected'), [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('settings', 'goBackAnyway'), onPress: () => router.back() }
      ]);
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backButton}>← {t('common', 'back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings', 'title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Google認証 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings', 'sectionAccount')}</Text>

          {isAuthenticated && currentUser ? (
            <View style={styles.authInfo}>
              <Text style={styles.authEmail}>✅ {currentUser.user.email}</Text>
              <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
                <Text style={styles.signOutText}>{t('settings', 'signOut')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
              <Text style={styles.signInText}>🔐 {t('settings', 'signIn')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Google Drive設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings', 'sectionDrive')}</Text>

          <Text style={styles.label}>{t('settings', 'folderLabel')}</Text>
          <TextInput
            style={[styles.input, styles.readOnlyInput]}
            value={folderName}
            editable={false}
            placeholder={DEFAULT_FOLDER_NAME}
            placeholderTextColor="#666"
          />

          <TouchableOpacity style={styles.selectButton} onPress={() => setPickerVisible(true)}>
            <Text style={styles.selectButtonText}>📂 {t('settings', 'changeFolder')}</Text>
          </TouchableOpacity>
        </View>

        {/* デバッグログ（開発者用） */}
        <View style={[styles.section, styles.debugSection]}>
          <TouchableOpacity
            style={styles.debugHeader}
            onPress={() => setIsDebugExpanded(!isDebugExpanded)}
          >
            <Text style={styles.sectionTitle}>🛠 Debug Logs</Text>
            <Text style={styles.debugToggleIcon}>{isDebugExpanded ? '▼' : '▶'}</Text>
          </TouchableOpacity>

          {isDebugExpanded && (
            <View style={styles.debugContent}>
              <View style={styles.debugControls}>
                <TouchableOpacity onPress={refreshLogs} style={styles.debugButton}>
                  <Text style={styles.debugButtonText}>🔄 Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClearLogs}
                  style={[styles.debugButton, styles.debugButtonDestructive]}
                >
                  <Text style={styles.debugButtonText}>🗑 Clear</Text>
                </TouchableOpacity>
              </View>

              {debugLogs.length === 0 ? (
                <Text style={styles.debugEmpty}>No logs available</Text>
              ) : (
                debugLogs.map((log, index) => (
                  <View key={index} style={styles.logEntry}>
                    <View style={styles.logHeader}>
                      <Text style={styles.logTime}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </Text>
                      <Text
                        style={[
                          styles.logType,
                          log.type === 'error'
                            ? styles.logError
                            : log.type === 'success'
                              ? styles.logSuccess
                              : styles.logInfo
                        ]}
                      >
                        {log.type.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.logMessage}>{log.message}</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        <FolderPickerModal
          visible={isPickerVisible}
          onClose={() => setPickerVisible(false)}
          initialFolderId={folderId}
          initialFolderName={folderName}
          onSelect={async (id, name) => {
            setFolderId(id);
            setFolderName(name);
            setPickerVisible(false);
            // 選択時に自動保存
            await saveDriveConfig({ folderId: id, folderName: name });
          }}
        />
        <LicenseModal
          visible={isLicenseModalVisible}
          onClose={() => setLicenseModalVisible(false)}
        />

        {/* エクスポート形式 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings', 'sectionExport')}</Text>
          <Text style={styles.hint}>{t('settings', 'exportHint')}</Text>

          <ExportFormatCheckbox
            label={t('settings', 'formatSheets')}
            description={t('settings', 'formatSheetsDesc')}
            checked={exportFormats.includes('googleSheets')}
            onToggle={() => toggleExportFormat('googleSheets')}
          />
          {/* PDFはSheetsのサブオプション */}
          {exportFormats.includes('googleSheets') && (
            <View style={styles.subOption}>
              <ExportFormatCheckbox
                label={t('settings', 'formatPdf')}
                description={t('settings', 'formatPdfDesc')}
                checked={exportSheetAsPdf}
                onToggle={async () => {
                  const newValue = !exportSheetAsPdf;
                  setExportSheetAsPdf(newValue);
                  await saveExportSheetAsPdf(newValue);
                }}
              />
            </View>
          )}
          <ExportFormatCheckbox
            label={t('settings', 'formatCsv')}
            description={t('settings', 'formatCsvDesc')}
            checked={exportFormats.includes('csv')}
            onToggle={() => toggleExportFormat('csv')}
          />
          <ExportFormatCheckbox
            label={t('settings', 'formatJson')}
            description={t('settings', 'formatJsonDesc')}
            checked={exportFormats.includes('json')}
            onToggle={() => toggleExportFormat('json')}
          />
        </View>

        {/* アプリ情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings', 'sectionAppInfo')}</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setLicenseModalVisible(true)}
          >
            <Text style={styles.selectButtonText}>📜 {t('settings', 'licenses')}</Text>
          </TouchableOpacity>
        </View>

        {/* 言語設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings', 'sectionLanguage')}</Text>
          <View style={styles.languageOptions}>
            <TouchableOpacity
              style={[styles.languageButton, language === 'ja' && styles.languageButtonActive]}
              onPress={() => setLanguage('ja')}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  language === 'ja' && styles.languageButtonTextActive
                ]}
              >
                {t('settings', 'languageJa')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageButton, language === 'en' && styles.languageButtonActive]}
              onPress={() => setLanguage('en')}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  language === 'en' && styles.languageButtonTextActive
                ]}
              >
                {t('settings', 'languageEn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 自動同期設定（実験的機能のため最下部に配置） */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('autoSync', 'sectionTitle')} (Beta)</Text>

          {/* 自動同期ON/OFF */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Text style={styles.settingLabel}>{t('autoSync', 'enabled')}</Text>
              <Text style={styles.settingDesc}>{t('autoSync', 'enabledDesc')}</Text>
            </View>
            <Switch
              value={autoSyncConfig.enabled}
              onValueChange={handleAutoSyncToggle}
              trackColor={{ false: '#3e3e4e', true: '#6366f180' }}
              thumbColor={autoSyncConfig.enabled ? '#6366f1' : '#9ca3af'}
            />
          </View>

          <Text style={{ color: '#f87171', fontSize: 12, marginTop: 8, marginBottom: 8 }}>
            {language === 'ja'
              ? '※OSの制約によるバックグラウンド処理のタイムアウト対策のため、同期はGoogle Sheetsのみに限定されます。動作は保証されないため、定期的にアプリを起動して同期することをお勧めします。'
              : '* Because of OS restrictions and timeout issues, background sync is limited to Google Sheets only. Operation is not guaranteed, so we recommend opening the app periodically to sync.'}
          </Text>

          {/* 同期間隔（有効時のみ表示） */}
          {autoSyncConfig.enabled && (
            <>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setShowIntervalPicker(!showIntervalPicker)}
              >
                <Text style={styles.settingLabel}>{t('autoSync', 'interval')}</Text>
                <Text style={styles.settingValue}>
                  {getSyncIntervalLabel(autoSyncConfig.intervalMinutes)[language]} ▼
                </Text>
              </TouchableOpacity>

              {/* 間隔選択（展開時） */}
              {showIntervalPicker && (
                <View style={styles.intervalPicker}>
                  {SYNC_INTERVALS.map((interval) => (
                    <TouchableOpacity
                      key={interval}
                      style={[
                        styles.intervalOption,
                        autoSyncConfig.intervalMinutes === interval && styles.intervalOptionActive
                      ]}
                      onPress={() => handleIntervalChange(interval)}
                    >
                      <Text
                        style={[
                          styles.intervalOptionText,
                          autoSyncConfig.intervalMinutes === interval &&
                            styles.intervalOptionTextActive
                        ]}
                      >
                        {getSyncIntervalLabel(interval)[language]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Wi-Fiのみ同期 */}
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <Text style={styles.settingLabel}>{t('autoSync', 'wifiOnly')}</Text>
                  <Text style={styles.settingDesc}>{t('autoSync', 'wifiOnlyDesc')}</Text>
                </View>
                <Switch
                  value={autoSyncConfig.wifiOnly}
                  onValueChange={handleWifiOnlyToggle}
                  trackColor={{ false: '#3e3e4e', true: '#6366f180' }}
                  thumbColor={autoSyncConfig.wifiOnly ? '#6366f1' : '#9ca3af'}
                />
              </View>

              {/* 最終バックグラウンド同期 */}
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>{t('autoSync', 'lastSync')}</Text>
                <Text style={styles.settingValue}>
                  {lastBackgroundSync
                    ? new Date(lastBackgroundSync).toLocaleString(
                        language === 'ja' ? 'ja-JP' : 'en-US'
                      )
                    : t('autoSync', 'never')}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1a1a2e'
  },
  backButton: {
    color: '#6366f1',
    fontSize: 16
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  placeholder: {
    width: 50
  },
  content: {
    flex: 1,
    padding: 16
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12
  },
  subHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12
  },
  label: {
    fontSize: 14,
    color: '#a0a0b0',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#1e1e2e',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2e2e3e'
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 8
  },
  authInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e2e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  authEmail: {
    color: '#10b981',
    fontSize: 14,
    flex: 1
  },
  signInButton: {
    backgroundColor: '#4285f4',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16
  },
  signInText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12
  },
  signOutText: {
    color: '#ffffff',
    fontSize: 12
  },
  saveButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  readOnlyInput: {
    backgroundColor: '#161622',
    color: '#9ca3af'
  },
  selectButton: {
    backgroundColor: '#4b5563',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8
  },
  selectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  subOption: {
    paddingLeft: 24,
    borderLeftWidth: 2,
    borderLeftColor: '#6366f1',
    marginLeft: 8,
    marginTop: 4
  },
  languageOptions: {
    flexDirection: 'row',
    gap: 12
  },
  languageButton: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2e2e3e'
  },
  languageButtonActive: {
    borderColor: '#6366f1',
    backgroundColor: '#6366f120'
  },
  languageButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500'
  },
  languageButtonTextActive: {
    color: '#6366f1',
    fontWeight: '600'
  },
  // 自動同期設定用スタイル
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e2e',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8
  },
  settingLabelContainer: {
    flex: 1,
    marginRight: 12
  },
  settingLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500'
  },
  settingDesc: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2
  },
  settingValue: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500'
  },
  intervalPicker: {
    backgroundColor: '#1e1e2e',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  intervalOption: {
    backgroundColor: '#2e2e3e',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#3e3e4e'
  },
  intervalOptionActive: {
    backgroundColor: '#6366f120',
    borderColor: '#6366f1'
  },
  intervalOptionText: {
    color: '#9ca3af',
    fontSize: 13
  },
  intervalOptionTextActive: {
    color: '#6366f1',
    fontWeight: '600'
  },
  // デバッグログ用スタイル
  debugSection: {
    borderTopWidth: 1,
    borderTopColor: '#2e2e3e',
    paddingTop: 24
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  debugToggleIcon: {
    color: '#6b7280',
    fontSize: 12
  },
  debugContent: {
    backgroundColor: '#161622',
    borderRadius: 8,
    padding: 12,
    marginTop: 8
  },
  debugControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 8
  },
  debugButton: {
    backgroundColor: '#2e2e3e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4
  },
  debugButtonDestructive: {
    backgroundColor: '#451a1a'
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 10
  },
  debugEmpty: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    padding: 12
  },
  logEntry: {
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e3e',
    paddingVertical: 8
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  logTime: {
    color: '#6b7280',
    fontSize: 10,
    fontFamily: 'monospace'
  },
  logType: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    borderRadius: 2,
    backgroundColor: '#2e2e3e',
    color: '#a0a0b0',
    overflow: 'hidden'
  },
  logInfo: { color: '#60a5fa' },
  logSuccess: { color: '#34d399' },
  logError: { color: '#f87171' },
  logMessage: {
    color: '#d1d5db',
    fontSize: 11,
    fontFamily: 'monospace'
  }
});
