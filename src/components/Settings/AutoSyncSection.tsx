import React, { useState } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { SYNC_INTERVALS, getSyncIntervalLabel } from '../../services/config/backgroundSyncConfig';
import { AutoSyncConfig, SyncInterval } from '../../types/exportTypes';
import { SettingsItem } from './SettingsItem';
import { SettingsSection } from './SettingsSection';

interface AutoSyncSectionProps {
  config: AutoSyncConfig;
  lastSyncTime: string | null;
  onToggleEnabled: (enabled: boolean) => void;
  onChangeInterval: (interval: SyncInterval) => void;
  onToggleWifiOnly: (wifiOnly: boolean) => void;
  isDebugMode?: boolean;
}

export const AutoSyncSection: React.FC<AutoSyncSectionProps> = ({
  config,
  lastSyncTime,
  onToggleEnabled,
  onChangeInterval,
  onToggleWifiOnly,
  isDebugMode = false
}) => {
  const { t, language } = useLanguage();
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [showIntervalPicker, setShowIntervalPicker] = useState(false);

  // 表示する間隔オプションをフィルタリング
  // isDebugModeがtrueの場合は5分(5)を表示
  // それ以外は 12時間(720) 以上を表示
  const visibleIntervals = SYNC_INTERVALS.filter((interval) => {
    if (isDebugMode && interval === 5) return true;
    return interval >= 720;
  });

  return (
    <SettingsSection title={t('autoSync', 'sectionTitle')}>
      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>{t('autoSync', 'note')}</Text>
      </View>

      <SettingsItem
        label={t('autoSync', 'enabled')}
        description={t('autoSync', 'enabledDesc')}
        icon="🔄"
        rightElement={
          <Switch
            value={config.enabled}
            onValueChange={onToggleEnabled}
            trackColor={{ false: colors.switchTrackFalse, true: '#6366f180' }}
            thumbColor={config.enabled ? '#6366f1' : '#9ca3af'}
          />
        }
      />

      {config.enabled && (
        <>
          <SettingsItem
            label={t('autoSync', 'interval')}
            value={getSyncIntervalLabel(config.intervalMinutes)[language]}
            icon="⏱️"
            onPress={() => setShowIntervalPicker(!showIntervalPicker)}
          />

          {showIntervalPicker && (
            <View style={styles.intervalContainer}>
              {visibleIntervals.map((interval) => (
                <TouchableOpacity
                  key={interval}
                  style={[
                    styles.intervalOption,
                    config.intervalMinutes === interval && styles.intervalOptionActive
                  ]}
                  onPress={() => {
                    onChangeInterval(interval);
                    setShowIntervalPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.intervalText,
                      config.intervalMinutes === interval && styles.intervalTextActive
                    ]}
                  >
                    {getSyncIntervalLabel(interval)[language]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <SettingsItem
            label={t('autoSync', 'wifiOnly')}
            description={t('autoSync', 'wifiOnlyDesc')}
            icon="📶"
            rightElement={
              <Switch
                value={config.wifiOnly}
                onValueChange={onToggleWifiOnly}
                trackColor={{ false: colors.switchTrackFalse, true: colors.switchTrackTrue }}
                thumbColor={config.wifiOnly ? colors.primary : colors.textSecondary}
              />
            }
          />

          <SettingsItem
            label={t('autoSync', 'lastSync')}
            value={
              lastSyncTime
                ? new Date(lastSyncTime).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US')
                : t('autoSync', 'never')
            }
            icon="📅"
          />
        </>
      )}
    </SettingsSection>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    intervalContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      padding: 16,
      backgroundColor: colors.surfaceHighlight || '#1e1e2d', // Fallback if surfaceHighlight missing
      marginHorizontal: 16,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12
    },
    intervalOption: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceVariant
    },
    intervalOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight || '#6366f130'
    },
    intervalText: {
      color: colors.textSecondary,
      fontSize: 13
    },
    intervalTextActive: {
      color: colors.primary,
      fontWeight: '600'
    },
    noteContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginBottom: 8
    },
    noteText: {
      fontSize: 12,
      color: colors.textTertiary,
      lineHeight: 16
    }
  });
