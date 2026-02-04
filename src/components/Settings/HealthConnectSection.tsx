import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors } from '../../theme/types';
import { SettingsItem } from './SettingsItem';
import { SettingsSection } from './SettingsSection';

interface HealthConnectSectionProps {
  hasPermissions: boolean;
  onOpenSettings: () => void;
}

export const HealthConnectSection: React.FC<HealthConnectSectionProps> = ({
  hasPermissions,
  onOpenSettings
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <SettingsSection title={t('settings', 'sectionHealthConnect')}>
      <SettingsItem
        label={t('settings', 'openHealthConnect')}
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
