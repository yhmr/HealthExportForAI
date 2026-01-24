import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatusCardProps {
  lastSyncTime: string | null;
  isHealthConnectConnected: boolean;
  isDriveConnected: boolean;
  autoSyncEnabled: boolean;
  t: (scope: any, key: string) => string;
  language: 'ja' | 'en';
}

export function StatusCard({
  lastSyncTime,
  isHealthConnectConnected,
  isDriveConnected,
  autoSyncEnabled,
  t,
  language
}: StatusCardProps) {
  const isReady = isHealthConnectConnected && isDriveConnected;
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
          <Text style={styles.label}>Health Connect</Text>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e1e2e',
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  badge: {
    backgroundColor: '#6366f130',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8
  },
  badgeText: {
    color: '#6366f1',
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
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4
  },
  value: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500'
  }
});
