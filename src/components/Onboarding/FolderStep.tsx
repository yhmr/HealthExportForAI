import React from 'react';
import { Text, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { FolderPickerModal } from '../FolderPickerModal';
import { SyncButton } from '../SyncButton';
import { onboardingStyles as styles } from './styles';

interface FolderStepProps {
  folderName: string;
  showFolderPicker: boolean;
  setShowFolderPicker: (show: boolean) => void;
  onFolderSelect: (folderId: string, name: string) => void;
  onNext: () => void;
}

export const FolderStep: React.FC<FolderStepProps> = ({
  folderName,
  showFolderPicker,
  setShowFolderPicker,
  onFolderSelect,
  onNext
}) => {
  const { t } = useLanguage();

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.icon}>📁</Text>
      <Text style={styles.title}>{t('onboarding', 'folderTitle')}</Text>
      <Text style={styles.description}>{t('onboarding', 'folderDesc')}</Text>

      <View style={styles.folderSelection}>
        <Text style={styles.folderLabel}>{t('onboarding', 'currentFolder')}</Text>
        <Text style={styles.folderName}>{folderName}</Text>
      </View>

      <SyncButton
        onPress={() => setShowFolderPicker(true)}
        isLoading={false}
        label={t('onboarding', 'changeFolder')}
        icon="✏️"
        variant="secondary"
      />

      <View style={styles.spacer} />

      <SyncButton
        onPress={onNext}
        isLoading={false}
        label={t('onboarding', 'next')}
        icon="➡️"
        variant="primary"
      />

      <FolderPickerModal
        visible={showFolderPicker}
        onClose={() => setShowFolderPicker(false)}
        onSelect={onFolderSelect}
      />
    </View>
  );
};
