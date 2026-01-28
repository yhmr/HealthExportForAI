import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { STORAGE_KEYS } from '../config/storageKeys';
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
  'nutrition'
];

// データタグのアイコン（ラベルはi18nのdataTypesを使用）
export const DATA_TAG_ICONS: Record<DataTagKey, string> = {
  steps: '👟',
  weight: '⚖️',
  bodyFat: '📊',
  totalCaloriesBurned: '🔥',
  basalMetabolicRate: '💪',
  sleep: '😴',
  exercise: '🏃',
  nutrition: '🥗'
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
  setLastSyncTime: (time: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleDataTag: (tag: DataTagKey) => void;
  setAllDataTagsSelected: (selected: boolean) => void;
  setSelectedDataTags: (tags: DataTagKey[]) => void;
  reset: () => void;
}

export const initialHealthData: HealthData = {
  steps: [],
  weight: [],
  bodyFat: [],
  totalCaloriesBurned: [],
  basalMetabolicRate: [],
  sleep: [],
  exercise: [],
  nutrition: []
};

export const useHealthStore = create<HealthStore>((set, get) => ({
  healthData: initialHealthData,
  lastSyncTime: null,
  isLoading: false,
  error: null,
  selectedDataTags: new Set(ALL_DATA_TAGS),
  syncDateRange: null,

  setAllData: (data, dateRange) => set({ healthData: data, syncDateRange: dateRange ?? null }),

  setLastSyncTime: (time) => {
    set({ lastSyncTime: time });
    if (time) {
      AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, time).catch((e) =>
        console.error('[HealthStore] Failed to save last sync time:', e)
      );
    } else {
      AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC_TIME).catch((e) =>
        console.error('[HealthStore] Failed to remove last sync time:', e)
      );
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  toggleDataTag: (tag) => {
    set((state) => {
      const newSet = new Set(state.selectedDataTags);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }

      // 永続化
      const tagsArray = Array.from(newSet);
      AsyncStorage.setItem(STORAGE_KEYS.SELECTED_DATA_TAGS, JSON.stringify(tagsArray)).catch((e) =>
        console.error('[HealthStore] Failed to save tags:', e)
      );

      return { selectedDataTags: newSet };
    });
  },

  setAllDataTagsSelected: (selected) => {
    const newSet = selected ? new Set(ALL_DATA_TAGS) : new Set<DataTagKey>();
    set({ selectedDataTags: newSet });

    // 永続化
    const tagsArray = Array.from(newSet);
    AsyncStorage.setItem(STORAGE_KEYS.SELECTED_DATA_TAGS, JSON.stringify(tagsArray)).catch((e) =>
      console.error('[HealthStore] Failed to save tags:', e)
    );
  },

  setSelectedDataTags: (tags) => {
    set({ selectedDataTags: new Set(tags) });
    // 永続化
    AsyncStorage.setItem(STORAGE_KEYS.SELECTED_DATA_TAGS, JSON.stringify(tags)).catch((e) =>
      console.error('[HealthStore] Failed to save tags:', e)
    );
  },

  reset: () => {
    set({
      healthData: initialHealthData,
      lastSyncTime: null,
      isLoading: false,
      error: null,
      selectedDataTags: new Set(ALL_DATA_TAGS),
      syncDateRange: null
    });
    // リセット時は永続化データもクリアすべきだが、
    // ここではメモリ上の状態リセットのみとするか、設定も消すか。
    // 「アプリの状態リセット」なら設定も消すべき。
    AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC_TIME);
    AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_DATA_TAGS); // タグ設定も初期化
  }
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
