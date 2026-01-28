import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { SyncButton } from '../SyncButton';
import { onboardingStyles as styles } from './styles';

interface ExportStepProps {
  isUploading: boolean;
  uploadError: string | null;
  onRetry: () => void;
}

export const ExportStep: React.FC<ExportStepProps> = ({ isUploading, uploadError, onRetry }) => {
  const { t } = useLanguage();

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.icon}>🚀</Text>
      <Text style={styles.title}>{t('onboarding', 'exportingTitle')}</Text>
      <Text style={styles.description}>{t('onboarding', 'exportingDesc')}</Text>

      {isUploading && (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 20 }} />
      )}

      {uploadError && (
        <View style={styles.actionContainer}>
          <Text style={styles.warningText}>{uploadError}</Text>
          <SyncButton
            onPress={onRetry}
            isLoading={false}
            label={t('onboarding', 'exportRetry')}
            icon="🔄"
            variant="primary"
          />
        </View>
      )}
    </View>
  );
};
