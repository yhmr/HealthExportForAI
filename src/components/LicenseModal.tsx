import React, { useMemo } from 'react';
import { FlatList, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import licensesData from '../config/licenses.json';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../theme/types';

interface LicenseModalProps {
  visible: boolean;
  onClose: () => void;
}

interface LicenseEntry {
  name: string;
  version: string;
  licenses: string;
  repository: string;
  licenseUrl: string;
}

// データ変換: licenses.json は { "package@version": { ... } } の形式
const parsedLicenses: LicenseEntry[] = Object.entries(licensesData).map(
  ([key, value]: [string, any]) => {
    const atIndex = key.lastIndexOf('@');
    const name = key.substring(0, atIndex);
    const version = key.substring(atIndex + 1);
    return {
      name,
      version,
      licenses: value.licenses,
      repository: value.repository,
      licenseUrl: value.licenseUrl
    };
  }
);

export function LicenseModal({ visible, onClose }: LicenseModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const renderItem = ({ item }: { item: LicenseEntry }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemVersion}>v{item.version}</Text>
      </View>
      <Text style={styles.itemLicense}>{item.licenses}</Text>
      {item.repository ? (
        <TouchableOpacity onPress={() => Linking.openURL(item.repository)}>
          <Text style={styles.linkText}>{item.repository}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Third-Party Licenses</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={parsedLicenses}
            renderItem={renderItem}
            keyExtractor={(item) => `${item.name}@${item.version}`}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      padding: 20
    },
    modalContent: {
      backgroundColor: colors.surface, // Changed from #1a1a2e
      borderRadius: 12,
      maxHeight: '80%',
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border // Changed from #2e2e3e
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border // Changed from #2e2e3e
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text // Changed from #ffffff
    },
    closeButton: {
      padding: 8
    },
    closeButtonText: {
      color: colors.textSecondary, // Changed from #a0a0b0
      fontSize: 18
    },
    listContent: {
      padding: 16
    },
    itemContainer: {
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border // Changed from #2e2e3e
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4
    },
    itemName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text // Changed from #ffffff
    },
    itemVersion: {
      fontSize: 12,
      color: colors.textSecondary // Changed from #a0a0b0
    },
    itemLicense: {
      fontSize: 14,
      color: '#10b981', // Kept green for license type
      marginBottom: 4
    },
    linkText: {
      fontSize: 12,
      color: colors.info, // Changed from #4285f4
      textDecorationLine: 'underline'
    }
  });
