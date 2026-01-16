import { create } from 'zustand';
import type { HealthData, StepsData, WeightData, BodyFatData, CaloriesData, BasalMetabolicRateData, SleepData, ExerciseData, NutritionData } from '../types/health';

interface HealthStore {
    // データ
    healthData: HealthData;
    lastSyncTime: string | null;
    isLoading: boolean;
    error: string | null;

    // アクション
    setSteps: (steps: StepsData[]) => void;
    setWeight: (weight: WeightData[]) => void;
    setBodyFat: (bodyFat: BodyFatData[]) => void;
    setTotalCaloriesBurned: (calories: CaloriesData[]) => void;
    setBasalMetabolicRate: (bmr: BasalMetabolicRateData[]) => void;
    setSleep: (sleep: SleepData[]) => void;
    setExercise: (exercise: ExerciseData[]) => void;
    setNutrition: (nutrition: NutritionData[]) => void;
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

    setSteps: (steps) =>
        set((state) => ({
            healthData: { ...state.healthData, steps },
        })),

    setWeight: (weight) =>
        set((state) => ({
            healthData: { ...state.healthData, weight },
        })),

    setBodyFat: (bodyFat) =>
        set((state) => ({
            healthData: { ...state.healthData, bodyFat },
        })),

    setTotalCaloriesBurned: (totalCaloriesBurned) =>
        set((state) => ({
            healthData: { ...state.healthData, totalCaloriesBurned },
        })),

    setBasalMetabolicRate: (basalMetabolicRate) =>
        set((state) => ({
            healthData: { ...state.healthData, basalMetabolicRate },
        })),

    setSleep: (sleep) =>
        set((state) => ({
            healthData: { ...state.healthData, sleep },
        })),

    setExercise: (exercise) =>
        set((state) => ({
            healthData: { ...state.healthData, exercise },
        })),

    setNutrition: (nutrition) =>
        set((state) => ({
            healthData: { ...state.healthData, nutrition },
        })),

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
