// healthStore のテスト

import { describe, it, expect, beforeEach } from 'vitest';
import { useHealthStore } from '../../src/stores/healthStore';

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
            weight: [{ date: '2026-01-16', value: 72.5, unit: 'kg' as const, time: '2026-01-16T07:00:00Z' }],
            bodyFat: [],
            totalCaloriesBurned: [],
            basalMetabolicRate: [],
            sleep: [],
            exercise: [],
            nutrition: [],
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
            nutrition: [],
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
});
