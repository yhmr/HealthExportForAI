import { create } from 'zustand';
import type { HealthData } from '../types/health';

interface HealthStore {
    // データ
    healthData: HealthData;
    lastSyncTime: string | null;
    isLoading: boolean;
    error: string | null;

    // アクション
    setAllData: (data: HealthData) => void;
    setLastSyncTime: (time: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
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

    setAllData: (data) => set({ healthData: data }),

    setLastSyncTime: (time) => set({ lastSyncTime: time }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    reset: () =>
        set({
            healthData: initialHealthData,
            lastSyncTime: null,
            isLoading: false,
            error: null,
        }),
}));
