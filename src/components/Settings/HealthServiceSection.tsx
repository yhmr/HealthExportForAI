import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors } from '../../theme/types';
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
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const serviceName = t('common', 'healthServiceName');

  // iOS/Androidで自動的に文言が切り替わる (LanguageContext参照)
  const openSettingsLabel = t('settings', 'openHealthConnect');

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
