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
    status: number;
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
 * データ集計用の型定義
 */
type DailyAggregation<T> = { [date: string]: T };

/**
 * 歩数データを取得（日次で合計）
 * ロジック:
 * 1. 指定期間の歩数レコードを取得
 * 2. レコードを日付ごとにグループ化
 * 3. 日ごとに歩数を合計して返却
 */
export async function fetchStepsData(
    startTime: Date,
    endTime: Date
): Promise<StepsData[]> {
    try {
        console.log(`[HealthConnect] 歩数データを取得開始: ${startTime.toISOString()} - ${endTime.toISOString()}`);
        const result = await readRecords('Steps', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        // 日毎の集計マップを作成
        const aggregation: DailyAggregation<StepsData> = {};

        for (const record of result.records) {
            const date = formatDate(record.startTime); // 日付を取得 (yyyy-MM-dd)

            if (!aggregation[date]) {
                aggregation[date] = {
                    date,
                    count: 0,
                };
            }

            // 歩数を加算
            aggregation[date].count += record.count;
        }

        // マップを配列に変換して返却
        return Object.values(aggregation).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
        console.error('歩数データ取得エラー:', error);
        return [];
    }
}

/**
 * 体重データを取得（日次の最新値を採用）
 * ロジック:
 * 1. 指定期間の体重レコードを取得
 * 2. レコードを日付ごとにグループ化
 * 3. 同じ日に複数の記録がある場合、計測時刻(time)が最も遅いデータを採用
 */
export async function fetchWeightData(
    startTime: Date,
    endTime: Date
): Promise<WeightData[]> {
    try {
        console.log(`[HealthConnect] 体重データを取得開始`);
        const result = await readRecords('Weight', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        const aggregation: DailyAggregation<WeightData> = {};

        for (const record of result.records) {
            const date = formatDate(record.time);

            // 既存のデータがない、または今回のレコードの方が時刻が新しい場合に更新
            if (!aggregation[date] || new Date(record.time) > new Date(aggregation[date].time)) {
                aggregation[date] = {
                    date,
                    value: record.weight.inKilograms,
                    unit: 'kg' as const,
                    time: record.time,
                };
            }
        }

        return Object.values(aggregation).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
        console.error('体重データ取得エラー:', error);
        return [];
    }
}

/**
 * 体脂肪データを取得（日次の最新値を採用）
 * ロジック:
 * 1. 指定期間の体脂肪レコードを取得
 * 2. 日付ごとにグループ化し、計測時刻が最も遅いデータを採用
 */
export async function fetchBodyFatData(
    startTime: Date,
    endTime: Date
): Promise<BodyFatData[]> {
    try {
        console.log(`[HealthConnect] 体脂肪データを取得開始`);
        const result = await readRecords('BodyFat', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        const aggregation: DailyAggregation<BodyFatData> = {};

        for (const record of result.records) {
            const date = formatDate(record.time);

            // 最新のデータを採用
            if (!aggregation[date] || new Date(record.time) > new Date(aggregation[date].time)) {
                aggregation[date] = {
                    date,
                    percentage: record.percentage,
                    time: record.time,
                };
            }
        }

        return Object.values(aggregation).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
        console.error('体脂肪データ取得エラー:', error);
        return [];
    }
}

/**
 * 総消費カロリーデータを取得（日次で合計）
 * ロジック:
 * 1. 指定期間の消費カロリーレコードを取得
 * 2. 日付ごとにカロリーを合計
 */
export async function fetchTotalCaloriesData(
    startTime: Date,
    endTime: Date
): Promise<CaloriesData[]> {
    try {
        console.log(`[HealthConnect] 消費カロリーデータを取得開始`);
        const result = await readRecords('TotalCaloriesBurned', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        const aggregation: DailyAggregation<CaloriesData> = {};

        for (const record of result.records) {
            const date = formatDate(record.startTime);

            if (!aggregation[date]) {
                aggregation[date] = {
                    date,
                    value: 0,
                    unit: 'kcal' as const,
                };
            }
            aggregation[date].value += record.energy.inKilocalories;
        }

        return Object.values(aggregation).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
        console.error('カロリーデータ取得エラー:', error);
        return [];
    }
}

/**
 * 基礎代謝データを取得（日次の最新値を採用）
 * ロジック:
 * 1. 指定期間のBMRレコードを取得
 * 2. 日付ごとに最新の記録を採用（基礎代謝は日によって変動しにくいため、最新値が妥当と判断）
 */
export async function fetchBasalMetabolicRateData(
    startTime: Date,
    endTime: Date
): Promise<BasalMetabolicRateData[]> {
    try {
        console.log(`[HealthConnect] 基礎代謝データを取得開始`);
        const result = await readRecords('BasalMetabolicRate', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        const aggregation: DailyAggregation<BasalMetabolicRateData> = {};

        for (const record of result.records) {
            const date = formatDate(record.time);

            if (!aggregation[date] || new Date(record.time) > new Date(aggregation[date].time || '')) {
                // record.time が存在しない場合もあるかもしれないが、通常はあるはず
                aggregation[date] = {
                    date,
                    value: record.basalMetabolicRate.inKilocaloriesPerDay,
                    unit: 'kcal/day' as const,
                    time: record.time,
                };
            }
        }

        return Object.values(aggregation).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
        console.error('基礎代謝データ取得エラー:', error);
        return [];
    }
}

/**
 * 睡眠データを取得（日次で合計時間と深い眠りの割合）
 * ロジック:
 * 1. 指定期間の睡眠セッションを取得
 * 2. 日付ごとに睡眠時間（分）と「深い眠り」の時間を集計
 * 3. 割合を計算して返却
 */
export async function fetchSleepData(
    startTime: Date,
    endTime: Date
): Promise<SleepData[]> {
    try {
        console.log(`[HealthConnect] 睡眠データを取得開始`);
        const result = await readRecords('SleepSession', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        // 集計用の一時型
        type SleepAggregation = SleepData & { totalDeepSleepMinutes: number };
        const aggregation: DailyAggregation<SleepAggregation> = {};

        for (const record of result.records) {
            // 睡眠の終了日を基準にする（「昨晩の睡眠」＝「今日の朝起きた睡眠」として扱うのが一般的）
            const date = formatDate(record.endTime);
            const start = new Date(record.startTime);
            const end = new Date(record.endTime);
            const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

            // 深い眠りの時間を計算
            // Health Connect のステージ定数 (一般的に 5 が Deep Sleep)
            let deepSleepMinutes = 0;
            if (record.stages) {
                for (const stage of record.stages) {
                    // stage.stage の型によって比較方法を変える
                    // 型エラーを防ぐため any キャスト等で柔軟に対応
                    const sType = stage.stage as any;
                    if (sType === 5 || sType === 'DEEP') {
                        const sStart = new Date(stage.startTime);
                        const sEnd = new Date(stage.endTime);
                        deepSleepMinutes += (sEnd.getTime() - sStart.getTime()) / 60000;
                    }
                }
            }

            if (!aggregation[date]) {
                aggregation[date] = {
                    date,
                    durationMinutes: 0,
                    totalDeepSleepMinutes: 0,
                };
            }

            aggregation[date].durationMinutes += durationMinutes;
            aggregation[date].totalDeepSleepMinutes += deepSleepMinutes;
        }

        return Object.values(aggregation)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((item) => {
                const { totalDeepSleepMinutes, ...rest } = item;
                const percentage = item.durationMinutes > 0
                    ? Math.round((item.totalDeepSleepMinutes / item.durationMinutes) * 100)
                    : 0;
                return {
                    ...rest,
                    deepSleepPercentage: percentage,
                };
            });
    } catch (error) {
        console.error('睡眠データ取得エラー:', error);
        return [];
    }
}

/**
 * エクササイズデータを取得（日付 x 種別 ごとに集計）
 * ロジック:
 * 1. 指定期間のエクササイズセッションを取得
 * 2. (日付 + 運動種別) をキーとしてグルーピング
 * 3. 継続時間を合計（カロリーは集計しない）
 */
export async function fetchExerciseData(
    startTime: Date,
    endTime: Date
): Promise<ExerciseData[]> {
    try {
        console.log(`[HealthConnect] エクササイズデータを取得開始`);
        const result = await readRecords('ExerciseSession', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        // キー: "yyyy-MM-dd_ExerciseType"
        const aggregation: { [key: string]: ExerciseData } = {};

        for (const record of result.records) {
            const date = formatDate(record.startTime);
            const type = record.exerciseType;
            const key = `${date}_${type}`;

            const start = new Date(record.startTime);
            const end = new Date(record.endTime);
            const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

            if (!aggregation[key]) {
                aggregation[key] = {
                    date,
                    type,
                    durationMinutes: 0,
                };
            }

            aggregation[key].durationMinutes += durationMinutes;
        }

        return Object.values(aggregation).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
        console.error('エクササイズデータ取得エラー:', error);
        return [];
    }
}

/**
 * 栄養データを取得（日次で合計、指定栄養素のみ）
 * ロジック:
 * 1. 指定期間の栄養レコードを取得
 * 2. 日付ごとにグルーピング
 * 3. 以下の項目を合計する
 *    - エネルギー (calories)
 *    - タンパク質 (protein)
 *    - 総脂肪 (totalFat)
 *    - 総炭水化物 (totalCarbohydrate)
 *    - 食物繊維 (dietaryFiber)
 *    - 飽和脂肪 (saturatedFat)
 */
export async function fetchNutritionData(
    startTime: Date,
    endTime: Date
): Promise<NutritionData[]> {
    try {
        console.log(`[HealthConnect] 栄養データを取得開始`);
        const result = await readRecords('Nutrition', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        const aggregation: DailyAggregation<NutritionData> = {};

        for (const record of result.records) {
            const date = formatDate(record.startTime);

            if (!aggregation[date]) {
                aggregation[date] = {
                    date,
                    calories: 0,
                    protein: 0,
                    totalFat: 0,
                    totalCarbohydrate: 0,
                    dietaryFiber: 0,
                    saturatedFat: 0,
                };
            }

            // 安全に加算するためにヘルパー関数を利用（undefined/nullなら0扱い）
            const add = (current: number | undefined, value: number | undefined | null) => (current || 0) + (value || 0);

            aggregation[date].calories = add(aggregation[date].calories, record.energy?.inKilocalories);
            aggregation[date].protein = add(aggregation[date].protein, record.protein?.inGrams);
            aggregation[date].totalFat = add(aggregation[date].totalFat, record.totalFat?.inGrams);
            aggregation[date].totalCarbohydrate = add(aggregation[date].totalCarbohydrate, record.totalCarbohydrate?.inGrams);
            aggregation[date].dietaryFiber = add(aggregation[date].dietaryFiber, record.dietaryFiber?.inGrams);
            aggregation[date].saturatedFat = add(aggregation[date].saturatedFat, record.saturatedFat?.inGrams);
        }

        return Object.values(aggregation).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
        console.error('栄養データ取得エラー:', error);
        return [];
    }
}

/**
 * すべてのヘルスデータを取得（変更なし、各fetch関数が日次データを返すようになる）
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
