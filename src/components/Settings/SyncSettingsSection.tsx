import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { SettingsItem } from './SettingsItem';
import { SettingsSection } from './SettingsSection';
import { useTheme } from '../../contexts/ThemeContext';

interface SyncSettingsSectionProps {
    onReset: () => void;
}

export const SyncSettingsSection: React.FC<SyncSettingsSectionProps> = ({ onReset }) => {
    const { colors } = useTheme();
    
    return (
        <SettingsSection title="Sync Settings">
            <SettingsItem
                icon="🔄"
                label="Re-fetch Initial Data"
                rightElement={
                    <TouchableOpacity onPress={onReset}>
                        <Text style={{ color: colors.primary }}>Reset</Text>
                    </TouchableOpacity>
                }
            />
        </SettingsSection>
    );
};
