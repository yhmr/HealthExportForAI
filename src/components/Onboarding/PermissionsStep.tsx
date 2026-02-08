import React from 'react';
import { BackHandler, Text, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { SyncButton } from '../SyncButton';
import { onboardingStyles as styles } from './styles';

interface PermissionsStepProps {
  hasPermissions: boolean;
  hasAttemptedPermissions: boolean;
  onRequestPermissions: () => void;
  onOpenSettings?: () => void;
  onNext: () => void;
}

export const PermissionsStep: React.FC<PermissionsStepProps> = ({
  hasPermissions,
  hasAttemptedPermissions,
  onRequestPermissions,
  onOpenSettings,
  onNext
}) => {
  const { t, language } = useLanguage();
  const serviceName = t('common', 'healthServiceName');

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.icon}>❤️</Text>
      <Text style={styles.title}>
        {t('onboarding', 'healthTitle').replace('Health Connect', serviceName)}
      </Text>
      <Text style={styles.description}>{t('onboarding', 'healthDesc')}</Text>
      {hasPermissions ? (
        <View style={styles.completedState}>
          <Text style={styles.successText}>{t('onboarding', 'permissionsGranted')}</Text>
          <SyncButton
            onPress={onNext}
            isLoading={false}
            label={t('onboarding', 'next')}
            icon="✅"
            variant="primary"
          />
        </View>
      ) : (
        <View style={styles.actionContainer}>
          {hasAttemptedPermissions && (
            <Text style={styles.warningText}>
              {t('onboarding', 'permissionRequired').replace('Health Connect', serviceName)}
            </Text>
          )}

          <SyncButton
            onPress={
              hasAttemptedPermissions && onOpenSettings ? onOpenSettings : onRequestPermissions
            }
            isLoading={false}
            label={
              hasAttemptedPermissions && onOpenSettings
                ? t('settings', 'openHealthConnect')
                : t('onboarding', 'grantPermissions')
            }
            icon={hasAttemptedPermissions && onOpenSettings ? '⚙️' : '🛡️'}
            variant="primary"
          />

          {hasAttemptedPermissions && (
            <SyncButton
              onPress={() => BackHandler.exitApp()}
              isLoading={false}
              label={t('onboarding', 'exitApp')}
              icon="✕"
              variant="secondary"
            />
          )}
        </View>
      )}
    </View>
  );
};
