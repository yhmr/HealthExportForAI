// Health Connect サービス

import {
    initialize,
    requestPermission,
    readRecords,
    getSdkStatus,
    SdkAvailabilityStatus,
} from 'react-native-health-connect';
import type {
    HealthData,
    StepsData,
    WeightData,
    BodyFatData,
    CaloriesData,
    BasalMetabolicRateData,
    SleepData,
    ExerciseData,
    NutritionData,
} from '../types/health';
import { formatDate } from '../utils/formatters';

// 必要な権限のリスト
const REQUIRED_PERMISSIONS = [
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'TotalCaloriesBurned' },
    { accessType: 'read', recordType: 'Weight' },
    { accessType: 'read', recordType: 'BodyFat' },
    { accessType: 'read', recordType: 'BasalMetabolicRate' },
    { accessType: 'read', recordType: 'SleepSession' },
    { accessType: 'read', recordType: 'ExerciseSession' },
    { accessType: 'read', recordType: 'Nutrition' },
] as const;

/**
 * Health Connectの初期化
 */
export async function initializeHealthConnect(): Promise<boolean> {
    try {
        const isInitialized = await initialize();
        return isInitialized;
    } catch (error) {
        console.error('Health Connect初期化エラー:', error);
        return false;
    }
}

/**
 * Health Connect SDKの利用可否をチェック
 */
export async function checkHealthConnectAvailability(): Promise<{
    available: boolean;
    status: SdkAvailabilityStatus;
}> {
    try {
        const status = await getSdkStatus();
        return {
            available: status === SdkAvailabilityStatus.SDK_AVAILABLE,
            status,
        };
    } catch (error) {
        console.error('SDK状態チェックエラー:', error);
        return {
            available: false,
            status: SdkAvailabilityStatus.SDK_UNAVAILABLE,
        };
    }
}

/**
 * 権限をリクエスト
 */
export async function requestHealthPermissions(): Promise<boolean> {
    try {
        const permissions = await requestPermission(REQUIRED_PERMISSIONS as any);
        // すべての権限が付与されたかチェック
        return permissions.length > 0;
    } catch (error) {
        console.error('権限リクエストエラー:', error);
        return false;
    }
}

/**
 * 歩数データを取得
 */
export async function fetchStepsData(
    startTime: Date,
    endTime: Date
): Promise<StepsData[]> {
    try {
        const result = await readRecords('Steps', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        return result.records.map((record: any) => ({
            date: formatDate(record.startTime),
            count: record.count,
            startTime: record.startTime,
            endTime: record.endTime,
        }));
    } catch (error) {
        console.error('歩数データ取得エラー:', error);
        return [];
    }
}

/**
 * 体重データを取得
 */
export async function fetchWeightData(
    startTime: Date,
    endTime: Date
): Promise<WeightData[]> {
    try {
        const result = await readRecords('Weight', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        return result.records.map((record: any) => ({
            date: formatDate(record.time),
            value: record.weight.inKilograms,
            unit: 'kg' as const,
            time: record.time,
        }));
    } catch (error) {
        console.error('体重データ取得エラー:', error);
        return [];
    }
}

/**
 * 体脂肪データを取得
 */
export async function fetchBodyFatData(
    startTime: Date,
    endTime: Date
): Promise<BodyFatData[]> {
    try {
        const result = await readRecords('BodyFat', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        return result.records.map((record: any) => ({
            date: formatDate(record.time),
            percentage: record.percentage,
            time: record.time,
        }));
    } catch (error) {
        console.error('体脂肪データ取得エラー:', error);
        return [];
    }
}

/**
 * 総消費カロリーデータを取得
 */
export async function fetchTotalCaloriesData(
    startTime: Date,
    endTime: Date
): Promise<CaloriesData[]> {
    try {
        const result = await readRecords('TotalCaloriesBurned', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        return result.records.map((record: any) => ({
            date: formatDate(record.startTime),
            value: record.energy.inKilocalories,
            unit: 'kcal' as const,
        }));
    } catch (error) {
        console.error('カロリーデータ取得エラー:', error);
        return [];
    }
}

/**
 * 基礎代謝データを取得
 */
export async function fetchBasalMetabolicRateData(
    startTime: Date,
    endTime: Date
): Promise<BasalMetabolicRateData[]> {
    try {
        const result = await readRecords('BasalMetabolicRate', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        return result.records.map((record: any) => ({
            date: formatDate(record.time),
            value: record.basalMetabolicRate.inKilocaloriesPerDay,
            unit: 'kcal/day' as const,
        }));
    } catch (error) {
        console.error('基礎代謝データ取得エラー:', error);
        return [];
    }
}

/**
 * 睡眠データを取得
 */
export async function fetchSleepData(
    startTime: Date,
    endTime: Date
): Promise<SleepData[]> {
    try {
        const result = await readRecords('SleepSession', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        return result.records.map((record: any) => {
            const start = new Date(record.startTime);
            const end = new Date(record.endTime);
            const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

            return {
                date: formatDate(record.endTime),
                startTime: record.startTime,
                endTime: record.endTime,
                durationMinutes,
                stages: record.stages?.map((stage: any) => ({
                    stage: stage.stage,
                    startTime: stage.startTime,
                    endTime: stage.endTime,
                })),
            };
        });
    } catch (error) {
        console.error('睡眠データ取得エラー:', error);
        return [];
    }
}

/**
 * エクササイズデータを取得
 */
export async function fetchExerciseData(
    startTime: Date,
    endTime: Date
): Promise<ExerciseData[]> {
    try {
        const result = await readRecords('ExerciseSession', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        return result.records.map((record: any) => {
            const start = new Date(record.startTime);
            const end = new Date(record.endTime);
            const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

            return {
                date: formatDate(record.startTime),
                type: record.exerciseType,
                startTime: record.startTime,
                endTime: record.endTime,
                durationMinutes,
            };
        });
    } catch (error) {
        console.error('エクササイズデータ取得エラー:', error);
        return [];
    }
}

/**
 * 栄養データを取得
 */
export async function fetchNutritionData(
    startTime: Date,
    endTime: Date
): Promise<NutritionData[]> {
    try {
        const result = await readRecords('Nutrition', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        return result.records.map((record: any) => ({
            date: formatDate(record.startTime),
            mealType: record.mealType,
            time: record.startTime,
            calories: record.energy?.inKilocalories,
            protein: record.protein?.inGrams,
            carbs: record.totalCarbohydrate?.inGrams,
            fat: record.totalFat?.inGrams,
        }));
    } catch (error) {
        console.error('栄養データ取得エラー:', error);
        return [];
    }
}

/**
 * すべてのヘルスデータを取得
 */
export async function fetchAllHealthData(
    startTime: Date,
    endTime: Date
): Promise<HealthData> {
    const [
        steps,
        weight,
        bodyFat,
        totalCaloriesBurned,
        basalMetabolicRate,
        sleep,
        exercise,
        nutrition,
    ] = await Promise.all([
        fetchStepsData(startTime, endTime),
        fetchWeightData(startTime, endTime),
        fetchBodyFatData(startTime, endTime),
        fetchTotalCaloriesData(startTime, endTime),
        fetchBasalMetabolicRateData(startTime, endTime),
        fetchSleepData(startTime, endTime),
        fetchExerciseData(startTime, endTime),
        fetchNutritionData(startTime, endTime),
    ]);

    return {
        steps,
        weight,
        bodyFat,
        totalCaloriesBurned,
        basalMetabolicRate,
        sleep,
        exercise,
        nutrition,
    };
}
