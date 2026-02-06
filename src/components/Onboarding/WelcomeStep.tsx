import React from 'react';
import { Text, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { getHealthServiceName } from '../../utils/healthServiceName';
import { SyncButton } from '../SyncButton';
import { onboardingStyles as styles } from './styles';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  const { t, language } = useLanguage();

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.icon}>👋</Text>
      <Text style={styles.title}>{t('onboarding', 'welcomeTitle')}</Text>
      <Text style={styles.description}>
        {t('onboarding', 'welcomeDesc').replace('Health Connect', getHealthServiceName(language))}
      </Text>
      <SyncButton
        onPress={onNext}
        isLoading={false}
        label={t('onboarding', 'getStarted')}
        icon="➡️"
        variant="primary"
      />
    </View>
  );
};
