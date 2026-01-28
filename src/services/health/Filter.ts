import { ALL_DATA_TAGS, DataTagKey, HealthData } from '../../types/health';

/**
 * データのフィルタリングと加工を担当するクラス
 */
export class Filter {
  /**
   * 選択されたタグに基づいてヘルスデータをフィルタリング
   * 選択されていないタグのデータは空配列に置き換える
   *
   * @param data 元のヘルスデータ
   * @param selectedTags 選択されたタグの配列
   * @returns フィルタリングされた新しいHealthDataオブジェクト
   */
  filterByTags(data: HealthData, selectedTags: string[]): HealthData {
    const selectedSet = new Set(selectedTags as DataTagKey[]);
    const result = { ...data };

    for (const tag of ALL_DATA_TAGS) {
      if (!selectedSet.has(tag)) {
        // 選択されていないタグのデータを空配列に
        (result as Record<DataTagKey, unknown[]>)[tag] = [];
      }
    }

    return result;
  }
}
