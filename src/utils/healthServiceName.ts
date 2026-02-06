import { Platform } from 'react-native';

/**
 * OSごとのヘルスケアサービス名を取得
 * @param language 言語コード ('ja' | 'en')
 */
export const getHealthServiceName = (language: 'ja' | 'en' = 'ja'): string => {
  if (Platform.OS === 'ios') {
    return language === 'ja' ? 'ヘルスケア' : 'Apple Health';
  }
  return 'Health Connect';
};
