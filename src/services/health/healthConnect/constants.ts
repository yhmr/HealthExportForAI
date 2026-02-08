import { ExerciseType, type Permission } from 'react-native-health-connect';

// アプリが読み取る対象の最小セット。
// ここを変更すると権限ダイアログ内容・権限チェック条件が同時に変わる。
export const REQUIRED_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'read', recordType: 'BodyFat' },
  { accessType: 'read', recordType: 'BasalMetabolicRate' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Nutrition' }
];

const exerciseTypeIdToName: Record<number, string> = Object.entries(ExerciseType).reduce(
  (acc, [name, id]) => {
    acc[id] = name
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
    return acc;
  },
  {} as Record<number, string>
);

// SDKの数値IDをUI/出力向けの読みやすい文字列に変換する。
export function getExerciseTypeName(typeId: number): string {
  return exerciseTypeIdToName[typeId] || `Unknown (${typeId})`;
}
