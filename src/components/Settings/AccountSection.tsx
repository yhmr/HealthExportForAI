import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SettingsItem } from './SettingsItem';
import { SettingsSection } from './SettingsSection';

interface AccountSectionProps {
  isAuthenticated: boolean;
  userEmail?: string;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const AccountSection: React.FC<AccountSectionProps> = ({
  isAuthenticated,
  userEmail,
  onSignIn,
  onSignOut
}) => {
  const { t } = useLanguage();

  return (
    <SettingsSection title={t('settings', 'sectionAccount')}>
      {isAuthenticated && userEmail ? (
        <>
          <SettingsItem icon="👤" label={userEmail} description="Google Account" />
          <SettingsItem
            label={t('settings', 'signOut')}
            icon="🚪"
            onPress={onSignOut}
            destructive
          />
        </>
      ) : (
        <SettingsItem label={t('settings', 'signIn')} icon="🔐" onPress={onSignIn} />
      )}
    </SettingsSection>
  );
};
