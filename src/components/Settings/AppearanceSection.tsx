import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors, ThemeMode } from '../../theme/types';
import { SettingsItem } from './SettingsItem';
import { SettingsSection } from './SettingsSection';

interface AppearanceSectionProps {
  currentThemeMode: ThemeMode;
  onSetThemeMode: (mode: ThemeMode) => void;
  currentLanguage: 'ja' | 'en';
  onSetLanguage: (lang: 'ja' | 'en') => void;
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  currentThemeMode,
  onSetThemeMode,
  currentLanguage,
  onSetLanguage
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <SettingsSection title={t('settings', 'sectionDisplay')}>
      <SettingsItem
        label={t('settings', 'theme')}
        icon="🌓"
        rightElement={
          <View style={styles.toggleContainer}>
            {(['light', 'dark', 'system'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.toggleBtn, currentThemeMode === mode && styles.toggleBtnActive]}
                onPress={() => onSetThemeMode(mode)}
              >
                <Text
                  style={[styles.toggleText, currentThemeMode === mode && styles.toggleTextActive]}
                >
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
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, currentLanguage === 'ja' && styles.toggleBtnActive]}
              onPress={() => onSetLanguage('ja')}
            >
              <Text
                style={[styles.toggleText, currentLanguage === 'ja' && styles.toggleTextActive]}
              >
                JA
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, currentLanguage === 'en' && styles.toggleBtnActive]}
              onPress={() => onSetLanguage('en')}
            >
              <Text
                style={[styles.toggleText, currentLanguage === 'en' && styles.toggleTextActive]}
              >
                EN
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SettingsSection>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    toggleContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceVariant,
      borderRadius: 8,
      padding: 2
    },
    toggleBtn: {
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderRadius: 6
    },
    toggleBtnActive: {
      backgroundColor: colors.primary
    },
    toggleText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600'
    },
    toggleTextActive: {
      color: '#ffffff'
    }
  });
