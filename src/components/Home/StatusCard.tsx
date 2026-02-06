import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors } from '../../theme/types';

import { TranslationKeys } from '../../i18n/translations';
import { getHealthServiceName } from '../../utils/healthServiceName';

interface StatusCardProps {
  lastSyncTime: string | null;
  isHealthConnectConnected: boolean;
  isDriveConnected: boolean;
  isSetupCompleted: boolean;
  autoSyncEnabled: boolean;
  t: (scope: keyof TranslationKeys, key: string) => string;
  language: 'ja' | 'en';
}

export function StatusCard({
  lastSyncTime,
  isHealthConnectConnected,
  isDriveConnected,
  isSetupCompleted,
  autoSyncEnabled,
  t,
  language
}: StatusCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isReady = isHealthConnectConnected && isDriveConnected && isSetupCompleted;
  const statusColor = isReady ? '#10b981' : '#f59e0b';
  const statusText = isReady ? t('home', 'statusReady') : t('home', 'statusSetupRequired');

  return (
    <View style={styles.container}>
      {/* Header Status */}
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
        {autoSyncEnabled && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Auto Sync On</Text>
          </View>
        )}
      </View>

      {/* Info Grid */}
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.label}>{t('home', 'lastSync')}</Text>
          <Text style={styles.value}>
            {lastSyncTime
              ? new Date(lastSyncTime).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : '--'}
          </Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>{getHealthServiceName(language)}</Text>
          <Text style={[styles.value, { color: isHealthConnectConnected ? '#10b981' : '#f59e0b' }]}>
            {isHealthConnectConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Google Drive</Text>
          <Text style={[styles.value, { color: isDriveConnected ? '#10b981' : '#f59e0b' }]}>
            {isDriveConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.label}>Setup</Text>
          <Text style={[styles.value, { color: isSetupCompleted ? '#10b981' : '#f59e0b' }]}>
            {isSetupCompleted ? 'Completed' : 'Incomplete'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8
    },
    statusText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: 'bold'
    },
    badge: {
      backgroundColor: colors.primaryLight,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8
    },
    badgeText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '600'
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16
    },
    gridItem: {
      minWidth: '45%',
      flex: 1
    },
    label: {
      color: colors.textSecondary,
      fontSize: 12,
      marginBottom: 4
    },
    value: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500'
    }
  });
