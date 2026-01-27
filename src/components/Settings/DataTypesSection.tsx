import React from 'react';
import { DataTagKey, initialHealthData } from '../../stores/healthStore';
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
