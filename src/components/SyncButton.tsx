// 同期ボタンコンポーネント

import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../theme/types';

interface SyncButtonProps {
  onPress: () => void;
  isLoading: boolean;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function SyncButton({
  onPress,
  isLoading,
  label,
  icon,
  variant = 'primary',
  disabled = false
}: SyncButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const buttonStyle = variant === 'primary' ? styles.primaryButton : styles.secondaryButton;
  const textStyle = variant === 'primary' ? styles.primaryText : styles.secondaryText;

  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle, (isLoading || disabled) && styles.disabled]}
      onPress={onPress}
      disabled={isLoading || disabled}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : colors.primary} />
      ) : (
        <>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={[styles.label, textStyle]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      marginVertical: 8,
      marginHorizontal: 16
    },
    primaryButton: {
      backgroundColor: colors.primary
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: colors.primary
    },
    disabled: {
      opacity: 0.6
    },
    icon: {
      fontSize: 20,
      marginRight: 8,
      color: colors.text // Added base color though overridden by specific style usually? No text style overrides icon color strictly unless applied.
      // Wait, primary button icon/label usually white.
    },
    label: {
      fontSize: 16,
      fontWeight: '600'
    },
    primaryText: {
      color: '#ffffff' // Always white for primary button
    },
    secondaryText: {
      color: colors.primary
    }
  });
