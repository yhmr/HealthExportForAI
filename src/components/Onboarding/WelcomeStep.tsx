import React from 'react';
import { Text, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { SyncButton } from '../SyncButton';
import { onboardingStyles as styles } from './styles';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  const { t } = useLanguage();

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.icon}>👋</Text>
      <Text style={styles.title}>{t('onboarding', 'welcomeTitle')}</Text>
      <Text style={styles.description}>{t('onboarding', 'welcomeDesc')}</Text>
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
