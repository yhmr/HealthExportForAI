import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Components
import { FolderPickerModal } from '../src/components/FolderPickerModal';

import { AboutModal } from '../src/components/AboutModal'; // Updated
import { LicenseModal } from '../src/components/LicenseModal';
import { SettingsItem } from '../src/components/Settings/SettingsItem';
import { SettingsSection } from '../src/components/Settings/SettingsSection';
import { SYNC_INTERVALS, getSyncIntervalLabel } from '../src/services/config/backgroundSyncConfig';

// Hooks
import { useTheme } from '../src/contexts/ThemeContext';
import { useSettings } from '../src/hooks/useSettings';
import { ThemeColors } from '../src/theme/types';

export default function SettingsScreen() {
  const router = useRouter();
  const { state, actions, t } = useSettings();
  const { colors, themeMode, setThemeMode } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // UI State (Modals)
  const [isPickerVisible, setPickerVisible] = useState(false);

  const [isLicenseModalVisible, setLicenseModalVisible] = useState(false);
  const [isAboutModalVisible, setAboutModalVisible] = useState(false); // Updated
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
                trackColor={{ false: colors.switchTrackFalse, true: colors.switchTrackTrue }}
                thumbColor={
                  state.exportFormats.includes('googleSheets')
                    ? colors.primary
                    : colors.textSecondary
                }
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
                  trackColor={{ false: colors.switchTrackFalse, true: colors.switchTrackTrue }}
                  thumbColor={state.exportSheetAsPdf ? colors.primary : colors.textSecondary}
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
                trackColor={{ false: colors.switchTrackFalse, true: colors.switchTrackTrue }}
                thumbColor={
                  state.exportFormats.includes('csv') ? colors.primary : colors.textSecondary
                }
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
                trackColor={{ false: colors.switchTrackFalse, true: colors.switchTrackTrue }}
                thumbColor={
                  state.exportFormats.includes('json') ? colors.primary : colors.textSecondary
                }
              />
            }
          />
        </SettingsSection>

        <SettingsSection title={t('settings', 'sectionDisplay')}>
          <SettingsItem
            label={t('settings', 'theme')}
            icon="🌓"
            rightElement={
              <View style={styles.languageToggle}>
                {(['light', 'dark', 'system'] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.langBtn, themeMode === mode && styles.langBtnActive]}
                    onPress={() => setThemeMode(mode)}
                  >
                    <Text style={[styles.langText, themeMode === mode && styles.langTextActive]}>
                      {t('settings', `theme${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />

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
                    trackColor={{ false: colors.switchTrackFalse, true: colors.switchTrackTrue }}
                    thumbColor={
                      state.autoSyncConfig.wifiOnly ? colors.primary : colors.textSecondary
                    }
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
            label={t('settings', 'about')}
            icon="ℹ️"
            onPress={() => setAboutModalVisible(true)}
          />
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
      <AboutModal
        visible={isAboutModalVisible}
        onClose={() => setAboutModalVisible(false)}
        onLicensePress={() => setLicenseModalVisible(true)}
        debugLogs={state.debugLogs}
        onRefreshLogs={actions.refreshLogs}
        onClearLogs={actions.clearLogs}
      />
      <LicenseModal visible={isLicenseModalVisible} onClose={() => setLicenseModalVisible(false)} />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: colors.headerBackground
    },
    headerButton: {
      padding: 4
    },
    headerButtonText: {
      color: colors.primary,
      fontSize: 16
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text
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
      backgroundColor: colors.surfaceHighlight, // Changed from #161622
      marginHorizontal: 16,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12
    },
    intervalOption: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceVariant
    },
    intervalOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight
    },
    intervalText: {
      color: colors.textSecondary,
      fontSize: 13
    },
    intervalTextActive: {
      color: colors.primary,
      fontWeight: '600'
    },
    languageToggle: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceVariant,
      borderRadius: 8,
      padding: 2
    },
    langBtn: {
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderRadius: 6
    },
    langBtnActive: {
      backgroundColor: colors.primary
    },
    langText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600'
    },
    langTextActive: {
      color: '#ffffff' // Always white when active
    }
  });
