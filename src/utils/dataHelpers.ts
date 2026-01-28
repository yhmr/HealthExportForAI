import { ALL_DATA_TAGS, DataTagKey, HealthData } from '../types/health';

/**
 * 選択されたタグに基づいてヘルスデータをフィルタリング
 * 選択されていないタグのデータは空配列に置き換える
 *
 * @param data 元のヘルスデータ
 * @param selectedTags 選択されたタグのセット
 * @returns フィルタリングされた新しいHealthDataオブジェクト
 */
export function filterHealthDataByTags(
  data: HealthData,
  selectedTags: Set<DataTagKey>
): HealthData {
  const result = { ...data };

  for (const tag of ALL_DATA_TAGS) {
    if (!selectedTags.has(tag)) {
      // 選択されていないタグのデータを空配列に
      (result as Record<DataTagKey, unknown[]>)[tag] = [];
    }
  }

  return result;
}
