import React from 'react';
import { Text, View, BackHandler } from 'react-native';
import { SyncButton } from '../SyncButton';
import { onboardingStyles as styles } from './styles';
import { useLanguage } from '../../contexts/LanguageContext';

interface PermissionsStepProps {
  hasPermissions: boolean;
  hasAttemptedPermissions: boolean;
  onRequestPermissions: () => void;
  onNext: () => void;
}

export const PermissionsStep: React.FC<PermissionsStepProps> = ({
  hasPermissions,
  hasAttemptedPermissions,
  onRequestPermissions,
  onNext
}) => {
  const { t } = useLanguage();

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.icon}>❤️</Text>
      <Text style={styles.title}>{t('onboarding', 'healthTitle')}</Text>
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
            <Text style={styles.warningText}>{t('onboarding', 'permissionRequired')}</Text>
          )}

          <SyncButton
            onPress={onRequestPermissions}
            isLoading={false}
            label={t('onboarding', 'grantPermissions')}
            icon="🛡️"
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
