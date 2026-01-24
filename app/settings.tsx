import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Components
import { FolderPickerModal } from '../src/components/FolderPickerModal';
import { LicenseModal } from '../src/components/LicenseModal';
import { SettingsItem } from '../src/components/Settings/SettingsItem';
import { SettingsSection } from '../src/components/Settings/SettingsSection';
import { SYNC_INTERVALS, getSyncIntervalLabel } from '../src/services/config/backgroundSyncConfig';

// Hooks
import { useSettings } from '../src/hooks/useSettings';

export default function SettingsScreen() {
  const router = useRouter();
  const { state, actions, t } = useSettings();

  // UI State (Modals)
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [isLicenseModalVisible, setLicenseModalVisible] = useState(false);
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);

  // Back Handler
  const handleBack = () => {
    if (state.exportFormats.length === 0) {
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>← {t('common', 'back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings', 'title')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Account Section */}
        <SettingsSection title={t('settings', 'sectionAccount')}>
          {state.isAuthenticated && state.currentUser ? (
            <>
              <SettingsItem
                icon="👤"
                label={state.currentUser.user.email}
                description="Google Account"
              />
              <SettingsItem
                label={t('settings', 'signOut')}
                icon="🚪"
                onPress={actions.signOut}
                destructive
              />
            </>
          ) : (
            <SettingsItem
              label={t('settings', 'signIn')}
              icon="🔐"
              onPress={actions.handleSignIn}
            />
          )}
        </SettingsSection>

        {/* Drive Section */}
        <SettingsSection title={t('settings', 'sectionDrive')}>
          <SettingsItem
            label={t('settings', 'folderLabel')}
            value={state.folderName}
            icon="📁"
            onPress={() => setPickerVisible(true)}
          />
        </SettingsSection>

        {/* Export Formats Section */}
        <SettingsSection title={t('settings', 'sectionExport')}>
          <SettingsItem
            label={t('settings', 'formatSheets')}
            description={t('settings', 'formatSheetsDesc')}
            icon="📊"
            rightElement={
              <Switch
                value={state.exportFormats.includes('googleSheets')}
                onValueChange={() => actions.toggleExportFormat('googleSheets')}
                trackColor={{ false: '#3e3e4e', true: '#6366f180' }}
                thumbColor={state.exportFormats.includes('googleSheets') ? '#6366f1' : '#9ca3af'}
              />
            }
          />

          {state.exportFormats.includes('googleSheets') && (
            <SettingsItem
              label={t('settings', 'formatPdf')}
              description={t('settings', 'formatPdfDesc')}
              icon="📄" // sub-item indicator?
              rightElement={
                <Switch
                  value={state.exportSheetAsPdf}
                  onValueChange={actions.togglePdfOption}
                  trackColor={{ false: '#3e3e4e', true: '#6366f180' }}
                  thumbColor={state.exportSheetAsPdf ? '#6366f1' : '#9ca3af'}
                />
              }
            />
          )}

          <SettingsItem
            label={t('settings', 'formatCsv')}
            description={t('settings', 'formatCsvDesc')}
            icon="📝"
            rightElement={
              <Switch
                value={state.exportFormats.includes('csv')}
                onValueChange={() => actions.toggleExportFormat('csv')}
                trackColor={{ false: '#3e3e4e', true: '#6366f180' }}
                thumbColor={state.exportFormats.includes('csv') ? '#6366f1' : '#9ca3af'}
              />
            }
          />

          <SettingsItem
            label={t('settings', 'formatJson')}
            description={t('settings', 'formatJsonDesc')}
            icon="📦"
            rightElement={
              <Switch
                value={state.exportFormats.includes('json')}
                onValueChange={() => actions.toggleExportFormat('json')}
                trackColor={{ false: '#3e3e4e', true: '#6366f180' }}
                thumbColor={state.exportFormats.includes('json') ? '#6366f1' : '#9ca3af'}
              />
            }
          />
        </SettingsSection>

        {/* Auto Sync Section (Beta) */}
        <SettingsSection title={`${t('autoSync', 'sectionTitle')} (Beta)`}>
          <SettingsItem
            label={t('autoSync', 'enabled')}
            description={t('autoSync', 'enabledDesc')}
            icon="🔄"
            rightElement={
              <Switch
                value={state.autoSyncConfig.enabled}
                onValueChange={actions.toggleAutoSync}
                trackColor={{ false: '#3e3e4e', true: '#6366f180' }}
                thumbColor={state.autoSyncConfig.enabled ? '#6366f1' : '#9ca3af'}
              />
            }
          />

          {state.autoSyncConfig.enabled && (
            <>
              <SettingsItem
                label={t('autoSync', 'interval')}
                value={getSyncIntervalLabel(state.autoSyncConfig.intervalMinutes)[state.language]}
                icon="⏱️"
                onPress={() => setShowIntervalPicker(!showIntervalPicker)}
              />

              {showIntervalPicker && (
                <View style={styles.intervalContainer}>
                  {SYNC_INTERVALS.map((interval) => (
                    <TouchableOpacity
                      key={interval}
                      style={[
                        styles.intervalOption,
                        state.autoSyncConfig.intervalMinutes === interval &&
                          styles.intervalOptionActive
                      ]}
                      onPress={() => {
                        actions.changeSyncInterval(interval);
                        setShowIntervalPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.intervalText,
                          state.autoSyncConfig.intervalMinutes === interval &&
                            styles.intervalTextActive
                        ]}
                      >
                        {getSyncIntervalLabel(interval)[state.language]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <SettingsItem
                label={t('autoSync', 'wifiOnly')}
                description={t('autoSync', 'wifiOnlyDesc')}
                icon="📶"
                rightElement={
                  <Switch
                    value={state.autoSyncConfig.wifiOnly}
                    onValueChange={actions.toggleWifiOnly}
                    trackColor={{ false: '#3e3e4e', true: '#6366f180' }}
                    thumbColor={state.autoSyncConfig.wifiOnly ? '#6366f1' : '#9ca3af'}
                  />
                }
              />

              <SettingsItem
                label={t('autoSync', 'lastSync')}
                value={
                  state.lastBackgroundSync
                    ? new Date(state.lastBackgroundSync).toLocaleString(
                        state.language === 'ja' ? 'ja-JP' : 'en-US'
                      )
                    : t('autoSync', 'never')
                }
                icon="📅"
              />
            </>
          )}
        </SettingsSection>

        {/* Other Section */}
        <SettingsSection title={t('settings', 'sectionAppInfo')}>
          <SettingsItem
            label={t('settings', 'sectionLanguage')}
            icon="🌐"
            rightElement={
              <View style={styles.languageToggle}>
                <TouchableOpacity
                  style={[styles.langBtn, state.language === 'ja' && styles.langBtnActive]}
                  onPress={() => actions.setLanguage('ja')}
                >
                  <Text style={[styles.langText, state.language === 'ja' && styles.langTextActive]}>
                    JA
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.langBtn, state.language === 'en' && styles.langBtnActive]}
                  onPress={() => actions.setLanguage('en')}
                >
                  <Text style={[styles.langText, state.language === 'en' && styles.langTextActive]}>
                    EN
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
          <SettingsItem
            label={t('settings', 'licenses')}
            icon="📜"
            onPress={() => setLicenseModalVisible(true)}
          />
        </SettingsSection>

        {/* Debug Section */}
        <SettingsSection title="Debug">
          <SettingsItem
            label="Debug Logs"
            icon="🛠️"
            rightElement={<Text style={styles.debugToggle}>{state.isDebugOpen ? '▲' : '▼'}</Text>}
            onPress={() => actions.setIsDebugOpen(!state.isDebugOpen)}
          />
          {state.isDebugOpen && (
            <View style={styles.debugContent}>
              <View style={styles.debugControls}>
                <TouchableOpacity onPress={actions.refreshLogs} style={styles.debugBtn}>
                  <Text style={styles.debugBtnText}>Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={actions.clearLogs}
                  style={[styles.debugBtn, styles.debugBtnDestructive]}
                >
                  <Text style={styles.debugBtnText}>Clear</Text>
                </TouchableOpacity>
              </View>
              {state.debugLogs.length === 0 ? (
                <Text style={styles.debugEmpty}>No logs available</Text>
              ) : (
                state.debugLogs.map((log, index) => (
                  <View key={index} style={styles.logEntry}>
                    <View style={styles.logHeader}>
                      <Text style={styles.logTime}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </Text>
                      <Text
                        style={[
                          styles.logType,
                          log.type === 'error' ? styles.logError : styles.logInfo
                        ]}
                      >
                        {log.type}
                      </Text>
                    </View>
                    <Text style={styles.logMsg}>{log.message}</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </SettingsSection>
      </ScrollView>

      {/* Modals */}
      <FolderPickerModal
        visible={isPickerVisible}
        onClose={() => setPickerVisible(false)}
        initialFolderId={state.folderId}
        initialFolderName={state.folderName}
        onSelect={async (id, name) => {
          await actions.updateFolder(id, name);
          setPickerVisible(false);
        }}
      />
      <LicenseModal visible={isLicenseModalVisible} onClose={() => setLicenseModalVisible(false)} />
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
    padding: 16,
    backgroundColor: '#1a1a2e'
  },
  headerButton: {
    padding: 4
  },
  headerButtonText: {
    color: '#6366f1',
    fontSize: 16
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  headerPlaceholder: {
    width: 50
  },
  content: {
    flex: 1,
    padding: 16
  },
  intervalContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
    backgroundColor: '#161622',
    marginHorizontal: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12
  },
  intervalOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3e3e4e',
    backgroundColor: '#2e2e3e'
  },
  intervalOptionActive: {
    borderColor: '#6366f1',
    backgroundColor: '#6366f120'
  },
  intervalText: {
    color: '#9ca3af',
    fontSize: 13
  },
  intervalTextActive: {
    color: '#6366f1',
    fontWeight: '600'
  },
  languageToggle: {
    flexDirection: 'row',
    backgroundColor: '#2e2e3e',
    borderRadius: 8,
    padding: 2
  },
  langBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  langBtnActive: {
    backgroundColor: '#6366f1'
  },
  langText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600'
  },
  langTextActive: {
    color: '#ffffff'
  },
  debugToggle: {
    color: '#6b7280',
    fontSize: 12
  },
  debugContent: {
    backgroundColor: '#161622',
    padding: 12
  },
  debugControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 8
  },
  debugBtn: {
    backgroundColor: '#2e2e3e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4
  },
  debugBtnDestructive: {
    backgroundColor: '#451a1a'
  },
  debugBtnText: {
    color: '#fff',
    fontSize: 12
  },
  debugEmpty: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    padding: 8
  },
  logEntry: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e3e'
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2
  },
  logTime: {
    color: '#6b7280',
    fontSize: 10,
    fontFamily: 'monospace'
  },
  logType: {
    fontSize: 10,
    fontWeight: 'bold'
  },
  logError: { color: '#f87171' },
  logInfo: { color: '#60a5fa' },
  logMsg: {
    color: '#d1d5db',
    fontSize: 11,
    fontFamily: 'monospace'
  }
});
