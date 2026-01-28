import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { DataTagKey } from '../../stores/healthStore';
import { DataTagList } from '../DataTagList';
import { PeriodPicker } from '../PeriodPicker';
import { SyncButton } from '../SyncButton';
import { onboardingStyles as styles } from './styles';

import { HealthData } from '../../types/health';

interface SetupStepProps {
  initialDays: number;
  setInitialDays: (days: number) => void;
  isSyncing: boolean;
  onFetch: () => void;
  hasFetched: boolean;
  healthData: HealthData;
  selectedTags: Set<DataTagKey>;
  onToggleTag: (tag: DataTagKey) => void;
  onNext: () => void;
}

export const SetupStep: React.FC<SetupStepProps> = ({
  initialDays,
  setInitialDays,
  isSyncing,
  onFetch,
  hasFetched,
  healthData,
  selectedTags,
  onToggleTag,
  onNext
}) => {
  const { t } = useLanguage();

  const colors = { primary: '#6366f1' };

  return (
    <ScrollView
      style={{ width: '100%' }}
      contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}
    >
      <Text style={styles.icon}>⚙️</Text>
      <Text style={styles.title}>{t('onboarding', 'setupTitle')}</Text>
      <Text style={styles.description}>{t('onboarding', 'setupDesc')}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('onboarding', 'setupInitialPeriod')}</Text>
        <PeriodPicker value={initialDays} onChange={setInitialDays} />
        <View style={{ marginTop: 16 }}>
          <SyncButton
            onPress={onFetch}
            isLoading={isSyncing}
            label={t('onboarding', 'fetchData')}
            icon="🔄"
            variant="secondary"
          />
          <Text style={{ ...styles.description, fontSize: 12, marginTop: 8 }}>
            {t('onboarding', 'fetchDescription')}
          </Text>
        </View>
      </View>

      {hasFetched && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('onboarding', 'setupDataTypes')}</Text>
          <DataTagList
            healthData={healthData}
            selectedTags={selectedTags}
            onToggleTag={onToggleTag}
          />
        </View>
      )}

      {!hasFetched && (
        <Text style={styles.warningText}>{t('onboarding', 'dataFetchRequired')}</Text>
      )}

      <View style={styles.spacer} />

      <SyncButton
        onPress={onNext}
        isLoading={false}
        label={t('onboarding', 'next')}
        icon="➡️"
        variant={hasFetched ? 'primary' : 'secondary'}
        disabled={!hasFetched}
      />
    </ScrollView>
  );
};
