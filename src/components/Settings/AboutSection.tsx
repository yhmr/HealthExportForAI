import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SettingsItem } from './SettingsItem';
import { SettingsSection } from './SettingsSection';

interface AboutSectionProps {
  onOpenAbout: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ onOpenAbout }) => {
  const { t } = useLanguage();

  return (
    <SettingsSection title={t('settings', 'sectionAppInfo')}>
      <SettingsItem label={t('settings', 'about')} icon="ℹ️" onPress={onOpenAbout} />
    </SettingsSection>
  );
};
