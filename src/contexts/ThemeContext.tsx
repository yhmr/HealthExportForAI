// テーマコンテキスト
// アプリ全体のテーマ（カラーモード）設定を管理
// システム設定の検知とユーザー設定の永続化を行う

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react';
import { useColorScheme } from 'react-native';
import { STORAGE_KEYS } from '../config/storageKeys';
import { darkColors, lightColors } from '../theme/colors';
import { ThemeColors, ThemeMode } from '../theme/types';

interface ThemeContextType {
  themeMode: ThemeMode; // 設定値 (light/dark/system)
  activeThemeMode: 'light' | 'dark'; // 実際に適用されているモード
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // 設定読み込み
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(STORAGE_KEYS.APP_THEME);
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
          setThemeModeState(savedTheme as ThemeMode);
        }
      } catch (error) {
        console.error('[ThemeContext] Failed to load theme:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // テーマ設定保存
  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.APP_THEME, mode);
    } catch (error) {
      console.error('[ThemeContext] Failed to save theme:', error);
    }
  }, []);

  // 実際に適用するモードを決定
  const activeThemeMode =
    themeMode === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : themeMode;

  // カラー定義を取得
  const colors = activeThemeMode === 'dark' ? darkColors : lightColors;

  // コンテキスト値
  const value: ThemeContextType = {
    themeMode,
    activeThemeMode,
    colors,
    setThemeMode
  };

  if (!isLoaded) {
    return null; // またはローディング画面
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
