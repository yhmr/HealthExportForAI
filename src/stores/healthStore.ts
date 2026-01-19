import { create } from 'zustand';
import type { HealthData } from '../types/health';

// データタグの種類（HealthDataのキーと対応）
export type DataTagKey = keyof HealthData;

// 全タグのリスト
export const ALL_DATA_TAGS: DataTagKey[] = [
    'steps',
    'weight',
    'bodyFat',
    'totalCaloriesBurned',
    'basalMetabolicRate',
    'sleep',
    'exercise',
    'nutrition',
];

// タグ表示情報
export const DATA_TAG_INFO: Record<DataTagKey, { label: string; icon: string }> = {
    steps: { label: '歩数', icon: '👟' },
    weight: { label: '体重', icon: '⚖️' },
    bodyFat: { label: '体脂肪率', icon: '📊' },
    totalCaloriesBurned: { label: '消費カロリー', icon: '🔥' },
    basalMetabolicRate: { label: '基礎代謝', icon: '💪' },
    sleep: { label: '睡眠', icon: '😴' },
    exercise: { label: '運動', icon: '🏃' },
    nutrition: { label: '栄養', icon: '🥗' },
};

interface HealthStore {
    // データ
    healthData: HealthData;
    lastSyncTime: string | null;
    isLoading: boolean;
    error: string | null;
    selectedDataTags: Set<DataTagKey>;
    syncDateRange: Set<string> | null; // 取得期間の全日付

    // アクション
    setAllData: (data: HealthData, dateRange?: Set<string>) => void;
    setLastSyncTime: (time: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    toggleDataTag: (tag: DataTagKey) => void;
    setAllDataTagsSelected: (selected: boolean) => void;
    reset: () => void;
}

const initialHealthData: HealthData = {
    steps: [],
    weight: [],
    bodyFat: [],
    totalCaloriesBurned: [],
    basalMetabolicRate: [],
    sleep: [],
    exercise: [],
    nutrition: [],
};

export const useHealthStore = create<HealthStore>((set) => ({
    healthData: initialHealthData,
    lastSyncTime: null,
    isLoading: false,
    error: null,
    selectedDataTags: new Set(ALL_DATA_TAGS),
    syncDateRange: null,

    setAllData: (data, dateRange) => set({ healthData: data, syncDateRange: dateRange ?? null }),

    setLastSyncTime: (time) => set({ lastSyncTime: time }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    toggleDataTag: (tag) =>
        set((state) => {
            const newSet = new Set(state.selectedDataTags);
            if (newSet.has(tag)) {
                newSet.delete(tag);
            } else {
                newSet.add(tag);
            }
            return { selectedDataTags: newSet };
        }),

    setAllDataTagsSelected: (selected) =>
        set({ selectedDataTags: selected ? new Set(ALL_DATA_TAGS) : new Set() }),

    reset: () =>
        set({
            healthData: initialHealthData,
            lastSyncTime: null,
            isLoading: false,
            error: null,
            selectedDataTags: new Set(ALL_DATA_TAGS),
            syncDateRange: null,
        }),
}));

/**
 * 選択されたタグに基づいてヘルスデータをフィルタリング
 * 選択されていないタグのデータは空配列に置き換える
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
