import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors } from '../../theme/types';

export function WidgetTips() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📱</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{t('home', 'widgetTipsTitle')}</Text>
        <Text style={styles.description}>{t('home', 'widgetTipsDesc')}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceVariant, // 少し薄い背景色
      padding: 16,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16
    },
    icon: {
      fontSize: 20
    },
    textContainer: {
      flex: 1
    },
    title: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4
    },
    description: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18
    }
  });
