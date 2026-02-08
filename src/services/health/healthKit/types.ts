// HealthKitレイヤー内で共通利用する型定義。
// 外部ライブラリの型だけでは扱いにくい箇所を吸収する目的で置いている。

export type HealthKitError = 'not_available' | 'permission_denied' | 'init_failed' | 'fetch_error';

/**
 * HealthKit API用のオプション型定義
 * Note: react-native-healthのHealthInputOptionsは実際のAPIと型定義に不整合があるため
 * (例: HealthUnitに'kg'がない、HealthObserverに必要な値がない)、独自の型を定義して使用
 */
export interface HealthKitQueryOptions {
  startDate: string;
  endDate: string;
  unit?: string;
  includeManuallyAdded?: boolean;
  type?: string;
}
