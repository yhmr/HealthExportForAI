import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase'
  },
  content: {
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    overflow: 'hidden'
  }
});
