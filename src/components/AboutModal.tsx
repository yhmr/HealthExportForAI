import React, { useMemo, useState } from 'react';
import {
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
// @ts-ignore
import pkg from '../../package.json';
import { useTheme } from '../contexts/ThemeContext';
import { DebugLogEntry } from '../services/debugLogService';
import { ThemeColors } from '../theme/types';

const REPO_URL = 'https://github.com/yhmr/HealthExportForAI';
const AUTHOR_URL = 'https://yhmr.github.io/';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
  onLicensePress: () => void;
  debugLogs: DebugLogEntry[];
  onRefreshLogs: () => void;
  onClearLogs: () => void;
}

export function AboutModal({
  visible,
  onClose,
  onLicensePress,
  debugLogs,
  onRefreshLogs,
  onClearLogs
}: AboutModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tapCount, setTapCount] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);

  const handleVersionPress = () => {
    if (showDebug) return;
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount >= 10) {
      setShowDebug(true);
    }
  };

  const handleClose = () => {
    setIsDebugExpanded(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header Area */}
          <View style={styles.headerArea}>
            <View style={styles.iconPlaceholder}>
              <Text style={styles.iconText}>H</Text>
            </View>
            <Text style={styles.appName}>Health Export For AI</Text>
            <TouchableWithoutFeedback onPress={handleVersionPress}>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>v{pkg.version}</Text>
              </View>
            </TouchableWithoutFeedback>
            <TouchableOpacity onPress={handleClose} style={styles.closeButtonAbsolute}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
          >
            {/* Info Card */}
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Author</Text>
                <Text style={styles.value}>{pkg.author}</Text>
              </View>

              <View style={styles.divider} />

              <TouchableOpacity onPress={() => Linking.openURL(REPO_URL)} style={styles.actionRow}>
                <Text style={styles.actionLabel}>GitHub Repository</Text>
                <Text style={styles.actionIcon}>→</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                onPress={() => Linking.openURL(AUTHOR_URL)}
                style={styles.actionRow}
              >
                <Text style={styles.actionLabel}>Visit Author's Site</Text>
                <Text style={styles.actionIcon}>→</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity onPress={onLicensePress} style={styles.actionRow}>
                <Text style={styles.actionLabel}>Third-party Licenses</Text>
                <Text style={styles.actionIcon}>→</Text>
              </TouchableOpacity>
            </View>

            {/* Debug Logs Section */}
            {showDebug && (
              <View style={[styles.card, styles.debugCard]}>
                <TouchableOpacity
                  style={styles.debugHeader}
                  onPress={() => setIsDebugExpanded(!isDebugExpanded)}
                >
                  <Text style={styles.debugTitle}>Debug Logs</Text>
                  <Text style={styles.debugToggleIcon}>{isDebugExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {isDebugExpanded && (
                  <View style={styles.debugBody}>
                    <View style={styles.debugControls}>
                      <TouchableOpacity onPress={onRefreshLogs} style={styles.debugBtn}>
                        <Text style={styles.debugBtnText}>Refresh</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={onClearLogs}
                        style={[styles.debugBtn, styles.debugBtnDestructive]}
                      >
                        <Text style={styles.debugBtnText}>Clear</Text>
                      </TouchableOpacity>
                    </View>

                    {debugLogs.length === 0 ? (
                      <Text style={styles.debugEmpty}>No logs available</Text>
                    ) : (
                      debugLogs.map((log, index) => (
                        <View key={index} style={styles.logEntry}>
                          <View style={styles.logHeader}>
                            <Text style={styles.logTime}>
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </Text>
                            <Text
                              style={[
                                styles.logType,
                                log.type === 'error' ? styles.logError : styles.logInfo
                              ]}
                            >
                              {log.type}
                            </Text>
                          </View>
                          <Text style={styles.logMsg}>{log.message}</Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>© 2026 {pkg.author}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24 // More padding for floating look
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 24, // Smoother corners
      width: '100%',
      maxWidth: 400,
      maxHeight: '85%',
      // Shadow for elevation
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 10,
      overflow: 'hidden'
    },
    headerArea: {
      alignItems: 'center',
      paddingTop: 32,
      paddingBottom: 24,
      paddingHorizontal: 24,
      backgroundColor: colors.surfaceHighlight, // Subtle contrast header
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    },
    closeButtonAbsolute: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10
    },
    closeButtonText: {
      color: colors.textSecondary,
      fontSize: 16,
      fontWeight: 'bold',
      lineHeight: 20
    },
    iconPlaceholder: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4
    },
    iconText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#ffffff'
    },
    appName: {
      fontSize: 22,
      fontWeight: '800', // Extra bold
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center'
    },
    versionBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12
    },
    versionText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary
    },
    scrollContent: {
      // flex: 1 removed to allow content to determine height when modal has maxHeight constraints
    },
    scrollContentContainer: {
      padding: 24
    },
    card: {
      backgroundColor: colors.cardBackground, // Use explicit card background
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 16
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16
    },
    label: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500'
    },
    value: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600'
    },
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: 'transparent' // Clickable feel
    },
    actionLabel: {
      fontSize: 15,
      color: colors.text,
      fontWeight: '500'
    },
    actionIcon: {
      fontSize: 18,
      color: colors.textTertiary
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 16
    },
    footer: {
      alignItems: 'center',
      marginTop: 8
    },
    footerText: {
      fontSize: 12,
      color: colors.textTertiary
    },
    // Debug Styles (Refined)
    debugCard: {
      borderColor: colors.primaryLight
    },
    debugHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.primaryLight
    },
    debugTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.primary
    },
    debugToggleIcon: {
      color: colors.primary,
      fontSize: 12
    },
    debugBody: {
      padding: 12,
      backgroundColor: colors.surfaceHighlight
    },
    debugControls: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      marginBottom: 12
    },
    debugBtn: {
      backgroundColor: colors.debugButton,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6
    },
    debugBtnDestructive: {
      backgroundColor: colors.destructiveButton
    },
    debugBtnText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '600'
    },
    debugEmpty: {
      color: colors.textTertiary,
      fontSize: 12,
      textAlign: 'center',
      padding: 16
    },
    logEntry: {
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    },
    logHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4
    },
    logTime: {
      color: colors.textTertiary,
      fontSize: 10,
      fontFamily: 'monospace'
    },
    logType: {
      fontSize: 10,
      fontWeight: 'bold',
      textTransform: 'uppercase'
    },
    logError: { color: colors.error },
    logInfo: { color: colors.info },
    logMsg: {
      color: colors.textSecondary,
      fontSize: 11,
      fontFamily: 'monospace'
    }
  });
