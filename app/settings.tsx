import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Components
import { AboutModal } from '../src/components/AboutModal';
import { FolderPickerModal } from '../src/components/FolderPickerModal';
import { LicenseModal } from '../src/components/LicenseModal';

// Section Components
import { AboutSection } from '../src/components/Settings/AboutSection';
import { AccountSection } from '../src/components/Settings/AccountSection';
import { AppearanceSection } from '../src/components/Settings/AppearanceSection';
import { AutoSyncSection } from '../src/components/Settings/AutoSyncSection';
import { DriveSection } from '../src/components/Settings/DriveSection';
import { ExportSection } from '../src/components/Settings/ExportSection';

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
  const [isAboutModalVisible, setAboutModalVisible] = useState(false);

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
        <AccountSection
          isAuthenticated={state.isAuthenticated}
          userEmail={state.currentUser?.user.email}
          onSignIn={actions.handleSignIn}
          onSignOut={actions.signOut}
        />

        <DriveSection
          folderName={state.folderName}
          onOpenFolderPicker={() => setPickerVisible(true)}
        />

        <ExportSection
          exportFormats={state.exportFormats}
          exportSheetAsPdf={state.exportSheetAsPdf}
          onToggleFormat={actions.toggleExportFormat}
          onTogglePdf={actions.togglePdfOption}
        />

        <AppearanceSection
          currentThemeMode={themeMode}
          onSetThemeMode={setThemeMode}
          currentLanguage={state.language}
          onSetLanguage={actions.setLanguage}
        />

        <AutoSyncSection
          config={state.autoSyncConfig}
          lastSyncTime={state.lastBackgroundSync}
          onToggleEnabled={actions.toggleAutoSync}
          onChangeInterval={actions.changeSyncInterval}
          onToggleWifiOnly={actions.toggleWifiOnly}
        />

        <AboutSection onOpenAbout={() => setAboutModalVisible(true)} />
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
    }
  });
