import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors } from '../../theme/types';
import { WIDGET_ICON_BASE64 } from '../../widgets/widget-icon';

interface ExportCircleButtonProps {
  onPress: () => void;
  isLoading: boolean;
  label: string;
  disabled?: boolean;
}

export function ExportCircleButton({
  onPress,
  isLoading,
  label,
  disabled = false
}: ExportCircleButtonProps) {
  const { colors } = useTheme();
  // テーマに基づいてスタイルを生成（メモ化は不要かもしれないが念のため）
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // アニメーション用の値
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // ローディング状態変化時のアニメーション
  useEffect(() => {
    if (isLoading) {
      // パルスアニメーション
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      opacityAnim.setValue(1); // リセット
      opacityAnim.stopAnimation();
    }
  }, [isLoading, opacityAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20
    }).start();
  };

  // ウィジェットのカラースキームを採用
  // 通常: #CFEAD1 (薄い緑), 同期中: #9ABF9F
  const widgetBgColor = isLoading ? '#9ABF9F' : '#CFEAD1';
  const widgetBorderColor = isLoading ? '#6E9672' : '#A3CFA8';
  const widgetTextColor = '#1a4d2e';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPress}
        disabled={isLoading || disabled}
        activeOpacity={1} // アニメーションで表現するので透過度変化はなし
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            styles.circle,
            disabled && styles.disabled,
            {
              backgroundColor: widgetBgColor,
              borderColor: widgetBorderColor,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim
            }
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="#ffffff" />
          ) : (
            <>
              <Image
                source={{ uri: WIDGET_ICON_BASE64 }}
                style={styles.iconImage}
                resizeMode="contain"
              />
              <Text style={[styles.label, { color: widgetTextColor }]}>{label}</Text>
            </>
          )}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32
    },
    circle: {
      width: 200,
      height: 200,
      borderRadius: 100,
      // backgroundColor: は動的に設定
      alignItems: 'center',
      justifyContent: 'center',
      // Shadow / Elevation
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8
      },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 10,
      borderWidth: 4
      // borderColor: は動的に設定
    },
    disabled: {
      backgroundColor: colors.surfaceVariant,
      shadowOpacity: 0.1,
      elevation: 2,
      borderColor: 'transparent'
    },
    iconImage: {
      width: 96,
      height: 96,
      marginBottom: 8
    },
    label: {
      fontSize: 18,
      fontWeight: 'bold',
      // color: は動的に設定
      letterSpacing: 1
    }
  });
