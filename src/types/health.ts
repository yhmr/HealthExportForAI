// ヘルスデータの型定義

export interface StepsData {
    date: string;
    count: number;
    startTime: string;
    endTime: string;
}

export interface WeightData {
    date: string;
    value: number;
    unit: 'kg';
    time: string;
}

export interface BodyFatData {
    date: string;
    percentage: number;
    time: string;
}

export interface CaloriesData {
    date: string;
    value: number;
    unit: 'kcal';
}

export interface BasalMetabolicRateData {
    date: string;
    value: number;
    unit: 'kcal/day';
}

export interface SleepStage {
    stage: 'AWAKE' | 'LIGHT' | 'DEEP' | 'REM' | 'UNKNOWN';
    startTime: string;
    endTime: string;
}

export interface SleepData {
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    stages?: SleepStage[];
}

export interface ExerciseData {
    date: string;
    type: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    calories?: number;
}

export interface NutritionData {
    date: string;
    mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'UNKNOWN';
    time: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
}

export interface HealthData {
    steps: StepsData[];
    weight: WeightData[];
    bodyFat: BodyFatData[];
    totalCaloriesBurned: CaloriesData[];
    basalMetabolicRate: BasalMetabolicRateData[];
    sleep: SleepData[];
    exercise: ExerciseData[];
    nutrition: NutritionData[];
}

export interface ExportData {
    exportedAt: string;
    period: {
        start: string;
        end: string;
    };
    data: HealthData;
}
