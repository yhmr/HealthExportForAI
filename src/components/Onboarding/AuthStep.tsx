import React from 'react';
import { Text, View, BackHandler } from 'react-native';
import { SyncButton } from '../SyncButton';
import { onboardingStyles as styles } from './styles';
import { useLanguage } from '../../contexts/LanguageContext';


interface AuthStepProps {
  isAuthenticated: boolean;
  currentUser: { user: { email: string | null } } | null;
  hasAttemptedAuth: boolean;
  onSignIn: () => void;
  onNext: () => void;
}

export const AuthStep: React.FC<AuthStepProps> = ({
  isAuthenticated,
  currentUser,
  hasAttemptedAuth,
  onSignIn,
  onNext
}) => {
  const { t } = useLanguage();

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.icon}>🔐</Text>
      <Text style={styles.title}>{t('onboarding', 'signInTitle')}</Text>
      <Text style={styles.description}>{t('onboarding', 'signInDesc')}</Text>
      {isAuthenticated ? (
        <View style={styles.completedState}>
          <Text style={styles.successText}>
            {t('onboarding', 'signedInAs').replace(
              '{{email}}',
              currentUser?.user.email || ''
            )}
          </Text>
          <SyncButton
            onPress={onNext}
            isLoading={false}
            label={t('onboarding', 'next')}
            icon="check"
            variant="primary"
          />
        </View>
      ) : (
        <View style={styles.actionContainer}>
          {hasAttemptedAuth && (
            <Text style={styles.warningText}>{t('onboarding', 'authRequired')}</Text>
          )}

          <SyncButton
            onPress={onSignIn}
            isLoading={false}
            label={t('onboarding', 'signInButton')}
            icon="🇬"
            variant="primary"
          />

          {hasAttemptedAuth && (
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
