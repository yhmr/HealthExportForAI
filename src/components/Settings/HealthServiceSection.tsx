import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors } from '../../theme/types';
import { getHealthServiceName } from '../../utils/healthServiceName';
import { SettingsItem } from './SettingsItem';
import { SettingsSection } from './SettingsSection';

interface HealthServiceSectionProps {
  hasPermissions: boolean;
  onOpenSettings: () => void;
}

export const HealthServiceSection: React.FC<HealthServiceSectionProps> = ({
  hasPermissions,
  onOpenSettings
}) => {
  const { t, language } = useLanguage();
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const serviceName = getHealthServiceName(language);

  // iOSの設定画面へ誘導する際などの文言
  // TODO: 翻訳ファイルに追加すべきだが、まずはここで分岐
  const openSettingsLabel =
    Platform.OS === 'ios'
      ? language === 'ja'
        ? 'ヘルスケア設定を開く'
        : 'Open Health Settings'
      : t('settings', 'openHealthConnect');

  return (
    <SettingsSection title={serviceName}>
      <SettingsItem
        label={openSettingsLabel}
        icon="❤️"
        onPress={onOpenSettings}
        rightElement={
          <Text style={[styles.statusText, hasPermissions ? styles.statusOk : styles.statusNg]}>
            {hasPermissions
              ? t('settings', 'healthConnectPermissionOk')
              : t('settings', 'healthConnectPermissionNg')}
          </Text>
        }
      />
    </SettingsSection>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    statusText: {
      fontSize: 14,
      fontWeight: '500'
    },
    statusOk: {
      color: colors.primary
    },
    statusNg: {
      color: colors.error
    }
  });
