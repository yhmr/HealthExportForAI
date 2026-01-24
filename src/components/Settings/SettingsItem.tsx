import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors } from '../../theme/types';

interface SettingsItemProps {
  icon?: string;
  label: string;
  description?: string;
  value?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function SettingsItem({
  icon,
  label,
  description,
  value,
  rightElement,
  onPress,
  destructive = false,
  disabled = false
}: SettingsItemProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.container, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
    >
      <View style={styles.leftContent}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <View style={styles.textContainer}>
          <Text style={[styles.label, destructive && styles.destructiveText]}>{label}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
      </View>

      <View style={styles.rightContent}>
        {value && <Text style={styles.value}>{value}</Text>}
        {rightElement}
      </View>
    </Container>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      minHeight: 56
    },
    disabled: {
      opacity: 0.5
    },
    leftContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 16
    },
    icon: {
      fontSize: 20,
      marginRight: 12,
      width: 24,
      textAlign: 'center',
      color: colors.text
    },
    textContainer: {
      flex: 1
    },
    label: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500'
    },
    destructiveText: {
      color: colors.error
    },
    description: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2
    },
    rightContent: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    value: {
      fontSize: 14,
      color: colors.textSecondary,
      marginRight: 8
    }
  });
