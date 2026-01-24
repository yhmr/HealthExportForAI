import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SettingsItem } from './SettingsItem';
import { SettingsSection } from './SettingsSection';

interface DriveSectionProps {
  folderName: string;
  onOpenFolderPicker: () => void;
}

export const DriveSection: React.FC<DriveSectionProps> = ({ folderName, onOpenFolderPicker }) => {
  const { t } = useLanguage();

  return (
    <SettingsSection title={t('settings', 'sectionDrive')}>
      <SettingsItem
        label={t('settings', 'folderLabel')}
        value={folderName}
        icon="📁"
        onPress={onOpenFolderPicker}
      />
    </SettingsSection>
  );
};
