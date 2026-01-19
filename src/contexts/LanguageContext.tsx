// 言語コンテキスト
// アプリ全体の言語設定を管理

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language } from '../i18n/translations';

const LANGUAGE_KEY = 'app_language';

type Translations = typeof translations.ja;

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => Promise<void>;
    t: (section: keyof Translations, key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
    children: ReactNode;
}

// デフォルト言語は日本語
const DEFAULT_LANGUAGE: Language = 'ja';

export function LanguageProvider({ children }: LanguageProviderProps) {
    const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
    const [isLoaded, setIsLoaded] = useState(false);

    // 保存された言語設定を読み込み
    useEffect(() => {
        const loadLanguage = async () => {
            try {
                const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
                if (savedLanguage === 'ja' || savedLanguage === 'en') {
                    setLanguageState(savedLanguage);
                }
            } catch (error) {
                console.error('[LanguageContext] Failed to load language:', error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadLanguage();
    }, []);

    // 言語を変更して保存
    const setLanguage = useCallback(async (lang: Language) => {
        setLanguageState(lang);
        try {
            await AsyncStorage.setItem(LANGUAGE_KEY, lang);
        } catch (error) {
            console.error('[LanguageContext] Failed to save language:', error);
        }
    }, []);

    // 翻訳関数
    const t = useCallback((section: keyof Translations, key: string): string => {
        const sectionData = translations[language][section] as Record<string, string>;
        return sectionData[key] ?? `${section}.${key}`;
    }, [language]);

    // 言語設定が読み込まれるまで子コンポーネントをレンダリングしない
    if (!isLoaded) {
        return null;
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

// カスタムフック
export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

