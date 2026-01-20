// ヘッダーコンポーネント

import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HeaderProps {
  title: string;
  showSettings?: boolean;
}

export function Header({ title, showSettings = true }: HeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {showSettings && (
        <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings')}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1a1a2e'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  settingsButton: {
    padding: 8
  },
  settingsIcon: {
    fontSize: 24
  }
});
