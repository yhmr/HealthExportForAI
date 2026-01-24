import React from 'react';
import { Switch } from 'react-native';
import { ExportFormat } from '../../config/driveConfig';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { SettingsItem } from './SettingsItem';
import { SettingsSection } from './SettingsSection';

interface ExportSectionProps {
  exportFormats: ExportFormat[];
  exportSheetAsPdf: boolean;
  onToggleFormat: (format: ExportFormat) => void;
  onTogglePdf: () => void;
}

export const ExportSection: React.FC<ExportSectionProps> = ({
  exportFormats,
  exportSheetAsPdf,
  onToggleFormat,
  onTogglePdf
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <SettingsSection title={t('settings', 'sectionExport')}>
      <SettingsItem
        label={t('settings', 'formatSheets')}
        description={t('settings', 'formatSheetsDesc')}
        icon="📊"
        rightElement={
          <Switch
            value={exportFormats.includes('googleSheets')}
            onValueChange={() => onToggleFormat('googleSheets')}
            trackColor={{ false: colors.switchTrackFalse, true: colors.switchTrackTrue }}
            thumbColor={
              exportFormats.includes('googleSheets') ? colors.primary : colors.textSecondary
            }
          />
        }
      />

      {exportFormats.includes('googleSheets') && (
        <SettingsItem
          label={t('settings', 'formatPdf')}
          description={t('settings', 'formatPdfDesc')}
          icon="📄"
          rightElement={
            <Switch
              value={exportSheetAsPdf}
              onValueChange={onTogglePdf}
              trackColor={{ false: colors.switchTrackFalse, true: colors.switchTrackTrue }}
              thumbColor={exportSheetAsPdf ? colors.primary : colors.textSecondary}
            />
          }
        />
      )}

      <SettingsItem
        label={t('settings', 'formatCsv')}
        description={t('settings', 'formatCsvDesc')}
        icon="📝"
        rightElement={
          <Switch
            value={exportFormats.includes('csv')}
            onValueChange={() => onToggleFormat('csv')}
            trackColor={{ false: colors.switchTrackFalse, true: colors.switchTrackTrue }}
            thumbColor={exportFormats.includes('csv') ? colors.primary : colors.textSecondary}
          />
        }
      />

      <SettingsItem
        label={t('settings', 'formatJson')}
        description={t('settings', 'formatJsonDesc')}
        icon="📦"
        rightElement={
          <Switch
            value={exportFormats.includes('json')}
            onValueChange={() => onToggleFormat('json')}
            trackColor={{ false: colors.switchTrackFalse, true: colors.switchTrackTrue }}
            thumbColor={exportFormats.includes('json') ? colors.primary : colors.textSecondary}
          />
        }
      />
    </SettingsSection>
  );
};
