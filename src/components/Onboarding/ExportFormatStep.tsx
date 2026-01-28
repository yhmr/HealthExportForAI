import React from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { ExportFormat } from '../../config/driveConfig';
import { useLanguage } from '../../contexts/LanguageContext';
import { SyncButton } from '../SyncButton';
import { onboardingStyles as styles } from './styles';

interface ExportFormatStepProps {
  exportFormats: ExportFormat[];
  toggleFormat: (format: ExportFormat) => void;
  exportSheetAsPdf: boolean;
  setExportSheetAsPdf: (value: boolean) => void;
  onNext: () => void;
}

export const ExportFormatStep: React.FC<ExportFormatStepProps> = ({
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
      <Text style={styles.icon}>📄</Text>
      <Text style={styles.title}>{t('onboarding', 'setupExportFormats')}</Text>
      <Text style={styles.description}>
        {t('onboarding', 'setupExportFormatsDesc') || t('onboarding', 'setupDesc')}
      </Text>

      <View style={styles.card}>
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

      <View style={styles.spacer} />

      <SyncButton
        onPress={onNext}
        isLoading={false}
        label={t('onboarding', 'next')}
        icon="➡️"
        variant="primary"
      />
    </ScrollView>
  );
};
