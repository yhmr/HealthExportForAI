import React from 'react';
import { Text, View } from 'react-native';
import { SyncButton } from '../SyncButton';
import { onboardingStyles as styles } from './styles';
import { useLanguage } from '../../contexts/LanguageContext';

interface CompletedStepProps {
  onNext: () => void;
}

export const CompletedStep: React.FC<CompletedStepProps> = ({ onNext }) => {
  const { t } = useLanguage();

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.icon}>🎉</Text>
      <Text style={styles.title}>{t('onboarding', 'completedTitle')}</Text>
      <Text style={styles.description}>{t('onboarding', 'completedDesc')}</Text>
      <SyncButton
        onPress={onNext}
        isLoading={false}
        label={t('onboarding', 'goToDashboard')}
        icon="🚀"
        variant="primary"
      />
    </View>
  );
};
