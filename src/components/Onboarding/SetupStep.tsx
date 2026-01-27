import React from 'react';
import { Text, View, ScrollView, Switch } from 'react-native';
import { SyncButton } from '../SyncButton';
import { PeriodPicker } from '../PeriodPicker';
import { DataTagList } from '../DataTagList';
import { onboardingStyles as styles } from './styles';
import { useLanguage } from '../../contexts/LanguageContext';
import { DataTagKey } from '../../stores/healthStore';
import { ExportFormat } from '../../config/driveConfig';
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
  exportFormats: ExportFormat[];
  toggleFormat: (format: ExportFormat) => void;
  exportSheetAsPdf: boolean;
  setExportSheetAsPdf: (value: boolean) => void;
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
  exportFormats,
  toggleFormat,
  exportSheetAsPdf,
  setExportSheetAsPdf,
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

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('onboarding', 'setupExportFormats')}</Text>
        <View style={styles.formatOption}>
          <Text style={styles.formatLabel}>{t('settings', 'formatSheets')}</Text>
          <Switch
            value={exportFormats.includes('googleSheets')}
            onValueChange={() => toggleFormat('googleSheets')}
            trackColor={{ false: '#374151', true: colors.primary }}
          />
        </View>
        {exportFormats.includes('googleSheets') && (
          <View style={styles.subOption}>
            <Text style={styles.subOptionLabel}>{t('onboarding', 'setupPdfOption')}</Text>
            <Switch
              value={exportSheetAsPdf}
              onValueChange={setExportSheetAsPdf}
              trackColor={{ false: '#374151', true: colors.primary }}
            />
          </View>
        )}
        <View style={styles.formatOption}>
          <Text style={styles.formatLabel}>{t('settings', 'formatCsv')}</Text>
          <Switch
            value={exportFormats.includes('csv')}
            onValueChange={() => toggleFormat('csv')}
            trackColor={{ false: '#374151', true: colors.primary }}
          />
        </View>
        <View style={styles.formatOption}>
          <Text style={styles.formatLabel}>{t('settings', 'formatJson')}</Text>
          <Switch
            value={exportFormats.includes('json')}
            onValueChange={() => toggleFormat('json')}
            trackColor={{ false: '#374151', true: colors.primary }}
          />
        </View>
      </View>

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
