// healthStore のテスト

import { beforeEach, describe, expect, it } from 'vitest';
import { useHealthStore } from '../../src/stores/healthStore';
import { filterHealthDataByTags } from '../../src/utils/dataHelpers';

describe('healthStore', () => {
  beforeEach(() => {
    // ストアをリセット
    useHealthStore.getState().reset();
  });

  it('初期状態が正しい', () => {
    const state = useHealthStore.getState();
    expect(state.healthData.steps).toEqual([]);
    expect(state.healthData.weight).toEqual([]);
    expect(state.lastSyncTime).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('setAllDataですべてのデータを設定できる', () => {
    const healthData = {
      steps: [{ date: '2026-01-16', count: 8000 }],
      weight: [
        { date: '2026-01-16', value: 72.5, unit: 'kg' as const, time: '2026-01-16T07:00:00Z' }
      ],
      bodyFat: [],
      totalCaloriesBurned: [],
      basalMetabolicRate: [],
      sleep: [],
      exercise: [],
      nutrition: []
    };
    useHealthStore.getState().setAllData(healthData);
    expect(useHealthStore.getState().healthData.steps).toEqual(healthData.steps);
    expect(useHealthStore.getState().healthData.weight).toEqual(healthData.weight);
  });

  it('setLoadingでローディング状態を設定できる', () => {
    useHealthStore.getState().setLoading(true);
    expect(useHealthStore.getState().isLoading).toBe(true);

    useHealthStore.getState().setLoading(false);
    expect(useHealthStore.getState().isLoading).toBe(false);
  });

  it('setErrorでエラーを設定できる', () => {
    useHealthStore.getState().setError('テストエラー');
    expect(useHealthStore.getState().error).toBe('テストエラー');

    useHealthStore.getState().setError(null);
    expect(useHealthStore.getState().error).toBeNull();
  });

  it('setLastSyncTimeで最終同期時刻を設定できる', () => {
    const time = '2026-01-16T17:00:00Z';
    useHealthStore.getState().setLastSyncTime(time);
    expect(useHealthStore.getState().lastSyncTime).toBe(time);
  });

  it('resetで初期状態に戻る', () => {
    // データを設定
    const healthData = {
      steps: [{ date: '2026-01-16', count: 8000 }],
      weight: [],
      bodyFat: [],
      totalCaloriesBurned: [],
      basalMetabolicRate: [],
      sleep: [],
      exercise: [],
      nutrition: []
    };
    useHealthStore.getState().setAllData(healthData);
    useHealthStore.getState().setLoading(true);
    useHealthStore.getState().setError('error');
    useHealthStore.getState().setLastSyncTime('2026-01-16T17:00:00Z');

    // リセット
    useHealthStore.getState().reset();

    // 確認
    const state = useHealthStore.getState();
    expect(state.healthData.steps).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.lastSyncTime).toBeNull();
  });

  it('toggleDataTagでタグの選択状態を切り替えられる', () => {
    // 初期状態は全て選択済み
    useHealthStore.getState().toggleDataTag('steps');
    expect(useHealthStore.getState().selectedDataTags.has('steps')).toBe(false);

    useHealthStore.getState().toggleDataTag('steps');
    expect(useHealthStore.getState().selectedDataTags.has('steps')).toBe(true);
  });

  it('setAllDataTagsSelectedで全選択・全解除ができる', () => {
    // 全解除
    useHealthStore.getState().setAllDataTagsSelected(false);
    expect(useHealthStore.getState().selectedDataTags.size).toBe(0);

    // 全選択
    useHealthStore.getState().setAllDataTagsSelected(true);
    // ALL_DATA_TAGSの数と同じはず
    const allTagsCount = 8; // steps, weight, bodyFat, totalCaloriesBurned, basalMetabolicRate, sleep, exercise, nutrition
    expect(useHealthStore.getState().selectedDataTags.size).toBe(allTagsCount);
  });

  it('setSelectedDataTagsで特定のタグセットを設定できる', () => {
    useHealthStore.getState().setSelectedDataTags(['steps', 'sleep']);
    expect(useHealthStore.getState().selectedDataTags.size).toBe(2);
    expect(useHealthStore.getState().selectedDataTags.has('steps')).toBe(true);
    expect(useHealthStore.getState().selectedDataTags.has('sleep')).toBe(true);
    expect(useHealthStore.getState().selectedDataTags.has('weight')).toBe(false);
  });
});

describe('filterHealthDataByTags', () => {
  it('選択されていないタグのデータを空配列にする', () => {
    const healthData = {
      steps: [{ date: '2026-01-16', count: 8000 }],
      weight: [
        { date: '2026-01-16', value: 70, unit: 'kg' as const, time: '2026-01-16T00:00:00Z' }
      ],
      bodyFat: [],
      totalCaloriesBurned: [],
      basalMetabolicRate: [],
      sleep: [],
      exercise: [],
      nutrition: []
    };

    const selectedTags = new Set<
      | 'steps'
      | 'weight'
      | 'bodyFat'
      | 'totalCaloriesBurned'
      | 'basalMetabolicRate'
      | 'sleep'
      | 'exercise'
      | 'nutrition'
    >(['steps']);
    const filtered = filterHealthDataByTags(healthData, selectedTags);

    expect(filtered.steps.length).toBe(1);
    expect(filtered.weight.length).toBe(0); // weightは選択されていないので空になるはず
  });
});
