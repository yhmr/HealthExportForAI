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
    time: string;
}

export interface SleepData {
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    deepSleepPercentage?: number;
}

export interface ExerciseData {
    date: string;
    type: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
}

export interface NutritionData {
    date: string;
    // 取得対象: エネルギー、タンパク質、総脂肪、総炭水化物、食物繊維、飽和脂肪
    calories?: number;
    protein?: number;
    totalFat?: number;
    totalCarbohydrate?: number;
    dietaryFiber?: number;
    saturatedFat?: number;
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
