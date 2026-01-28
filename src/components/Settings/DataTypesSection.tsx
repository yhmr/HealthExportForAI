import React from 'react';
import { initialHealthData } from '../../stores/healthStore';
import { DataTagKey } from '../../types/health';
import { DataTagList } from '../DataTagList';
import { SettingsSection } from './SettingsSection';

interface DataTypesSectionProps {
  selectedTags: Set<DataTagKey>;
  onToggleTag: (tag: DataTagKey) => void;
}

export const DataTypesSection: React.FC<DataTypesSectionProps> = ({
  selectedTags,
  onToggleTag
}) => {
  return (
    <SettingsSection title="Data Types">
      <DataTagList
        healthData={initialHealthData}
        selectedTags={selectedTags}
        onToggleTag={onToggleTag}
        hideCount={true}
      />
    </SettingsSection>
  );
};
