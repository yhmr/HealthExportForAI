import { PermissionsAndroid, Platform } from 'react-native';
import {
  aggregateGroupByDuration,
  ExerciseType,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus
} from 'react-native-health-connect';
import { HealthConnectError } from '../types/errors';
import type {
  BasalMetabolicRateData,
  BodyFatData,
  CaloriesData,
  ExerciseData,
  HealthData,
  NutritionData,
  SleepData,
  StepsData,
  WeightData
} from '../types/health';
import { err, ok, Result } from '../types/result';
import { formatDate } from '../utils/formatters';
import { addDebugLog } from './debugLogService';

import { aggregateByLatestPerDay } from '../utils/healthAggregation';

// 必要な権限のリスト
const REQUIRED_PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'read', recordType: 'BodyFat' },
  { accessType: 'read', recordType: 'BasalMetabolicRate' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Nutrition' }
] as const;

/**
 * Health Connectの初期化
 */
/**
 * Health Connectの初期化
 */
export async function initializeHealthConnect(): Promise<Result<boolean, HealthConnectError>> {
  try {
    const isInitialized = await initialize();
    return ok(isInitialized);
  } catch (error) {
    const msg = `Init Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'INIT_FAILED', error));
  }
}

/**
 * Health Connect SDKの利用可否をチェック
 */
/**
 * Health Connect SDKの利用可否をチェック
 */
export async function checkHealthConnectAvailability(): Promise<
  Result<{ available: boolean; status: number }, HealthConnectError>
> {
  try {
    const status = await getSdkStatus();
    return ok({
      available: status === SdkAvailabilityStatus.SDK_AVAILABLE,
      status
    });
  } catch (error) {
    return err(
      new HealthConnectError(
        `Availability Check Error: ${error}`,
        'CHECK_AVAILABILITY_FAILED',
        error
      )
    );
  }
}

/**
 * 権限状態を確認（UI表示なし）
 */
/**
 * 権限状態を確認（UI表示なし）
 */
export async function checkHealthPermissions(): Promise<Result<boolean, HealthConnectError>> {
  try {
    const grantedPermissions = await getGrantedPermissions();

    const allGranted = REQUIRED_PERMISSIONS.every((required) =>
      grantedPermissions.some(
        (granted) =>
          granted.accessType === required.accessType && granted.recordType === required.recordType
      )
    );

    return ok(allGranted);
  } catch (error) {
    const msg = `Check Permission Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'CHECK_PERMISSIONS_FAILED', error));
  }
}

/**
 * 権限をリクエスト
 */
/**
 * 権限をリクエスト
 */
export async function requestHealthPermissions(): Promise<Result<boolean, HealthConnectError>> {
  try {
    // 1. Health Connect のデータ読み取り権限をリクエスト
    const grantedPermissions = await requestPermission(REQUIRED_PERMISSIONS as any);

    // 2. 要求した権限がすべて許可されたかチェック
    // REQUIRED_PERMISSIONS の各項目が grantedPermissions に含まれているか確認
    const allGranted = REQUIRED_PERMISSIONS.every((required) =>
      grantedPermissions.some(
        (granted) =>
          granted.accessType === required.accessType && granted.recordType === required.recordType
      )
    );

    if (!allGranted) {
      // 不足している権限を特定してログ出力
      const missingPermissions = REQUIRED_PERMISSIONS.filter(
        (required) =>
          !grantedPermissions.some(
            (granted) =>
              granted.accessType === required.accessType &&
              granted.recordType === required.recordType
          )
      );
      await addDebugLog(
        `[HealthConnect] Permissions missing: ${JSON.stringify(missingPermissions)}`,
        'warn'
      );
      return ok(false);
    }

    return ok(true);
  } catch (error) {
    const msg = `Permission Request Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'REQUEST_PERMISSIONS_FAILED', error));
  }
}

/**
 * バックグラウンド読み取り権限をリクエスト (Android 14+)
 */
/**
 * バックグラウンド読み取り権限をリクエスト (Android 14+)
 */
export async function requestBackgroundHealthPermission(): Promise<
  Result<boolean, HealthConnectError>
> {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 34) {
      const backgroundPermission =
        'android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND' as any;
      const hasBackgroundPermission = await PermissionsAndroid.check(backgroundPermission);

      if (!hasBackgroundPermission) {
        await addDebugLog('[HealthConnect] Requesting background permission', 'info');
        const granted = await PermissionsAndroid.request(backgroundPermission);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          await addDebugLog('[HealthConnect] Background permission denied', 'warn');
          return ok(false);
        } else {
          await addDebugLog('[HealthConnect] Background permission granted', 'success');
          return ok(true);
        }
      }
      return ok(true); // 既に許可されている
    }
    return ok(true); // 対象外のOSバージョンは常に許可扱い
  } catch (error) {
    const msg = `Background Permission Request Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'REQUEST_BG_PERMISSION_FAILED', error));
  }
}

/**
 * データ集計用の型定義
 */
type DailyAggregation<T> = { [date: string]: T };

/**
 * ExerciseType IDを名前に変換するマッピング
 */
const exerciseTypeIdToName: { [key: number]: string } = Object.entries(ExerciseType).reduce(
  (acc, [name, id]) => {
    acc[id] = name
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase()); // Title Case に変換
    return acc;
  },
  {} as { [key: number]: string }
);

/**
 * ExerciseType IDから名前を取得
 */
function getExerciseTypeName(typeId: number): string {
  return exerciseTypeIdToName[typeId] || `Unknown (${typeId})`;
}

/**
 * 歩数データを取得（日次で集計、Health Connectの重複除去を使用）
 * ロジック:
 * 1. aggregateGroupByPeriodを使用して日ごとの集計データを取得
 * 2. Health Connectが内部で重複除去を行うため、複数ソースからのデータが正しく集計される
 */
export async function fetchStepsData(
  startTime: Date,
  endTime: Date
): Promise<Result<StepsData[], HealthConnectError>> {
  try {
    // aggregateGroupByDurationを使用して24時間ごとに集計（重複除去される）
    const result = await aggregateGroupByDuration({
      recordType: 'Steps',
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      },
      timeRangeSlicer: {
        duration: 'DAYS',
        length: 1
      }
    });

    // 結果を StepsData 形式に変換
    const stepsData: StepsData[] = result.map((item) => ({
      date: formatDate(item.startTime),
      count: item.result.COUNT_TOTAL ?? 0
    }));

    return ok(stepsData.sort((a, b) => a.date.localeCompare(b.date)));
  } catch (error) {
    const msg = `Fetch Steps Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'FETCH_STEPS_FAILED', error));
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
): Promise<Result<WeightData[], HealthConnectError>> {
  try {
    const result = await readRecords('Weight', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      }
    });

    const data = aggregateByLatestPerDay(
      result.records,
      (record) => record.time,
      (record, date) => ({
        date,
        value: record.weight.inKilograms,
        unit: 'kg' as const,
        time: record.time
      })
    );
    return ok(data);
  } catch (error) {
    const msg = `Fetch Weight Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'FETCH_WEIGHT_FAILED', error));
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
): Promise<Result<BodyFatData[], HealthConnectError>> {
  try {
    const result = await readRecords('BodyFat', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      }
    });

    const data = aggregateByLatestPerDay(
      result.records,
      (record) => record.time,
      (record, date) => ({
        date,
        percentage: record.percentage,
        time: record.time
      })
    );
    return ok(data);
  } catch (error) {
    const msg = `Fetch BodyFat Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'FETCH_BODY_FAT_FAILED', error));
  }
}

/**
 * 総消費カロリーデータを取得（日次で集計、Health Connectの重複除去を使用）
 * ロジック:
 * 1. aggregateGroupByDurationを使用して日ごとの集計データを取得
 * 2. Health Connectが内部で重複除去を行うため、複数ソースからのデータが正しく集計される
 */
export async function fetchTotalCaloriesData(
  startTime: Date,
  endTime: Date
): Promise<Result<CaloriesData[], HealthConnectError>> {
  try {
    // aggregateGroupByDurationを使用して24時間ごとに集計（重複除去される）
    const result = await aggregateGroupByDuration({
      recordType: 'TotalCaloriesBurned',
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      },
      timeRangeSlicer: {
        duration: 'DAYS',
        length: 1
      }
    });

    // 結果を CaloriesData 形式に変換
    const caloriesData: CaloriesData[] = result.map((item) => ({
      date: formatDate(item.startTime),
      value: item.result.ENERGY_TOTAL?.inKilocalories ?? 0,
      unit: 'kcal' as const
    }));

    return ok(caloriesData.sort((a, b) => a.date.localeCompare(b.date)));
  } catch (error) {
    const msg = `Fetch Calories Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'FETCH_CALORIES_FAILED', error));
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
): Promise<Result<BasalMetabolicRateData[], HealthConnectError>> {
  try {
    const result = await readRecords('BasalMetabolicRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      }
    });

    const data = aggregateByLatestPerDay(
      result.records,
      (record) => record.time,
      (record, date) => ({
        date,
        value: record.basalMetabolicRate.inKilocaloriesPerDay,
        unit: 'kcal/day' as const,
        time: record.time
      })
    );
    return ok(data);
  } catch (error) {
    const msg = `Fetch BMR Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'FETCH_BMR_FAILED', error));
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
): Promise<Result<SleepData[], HealthConnectError>> {
  try {
    const result = await readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      }
    });

    // ... (aggregation logic unchanged except wrapper) ...
    // Note: I will just paste the logic inside try block to be safe, or just use the whole function replacement.
    // Logic is long, so I'll preserve it.

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
      let deepSleepMinutes = 0;
      if (record.stages) {
        for (const stage of record.stages) {
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
          totalDeepSleepMinutes: 0
        };
      }

      aggregation[date].durationMinutes += durationMinutes;
      aggregation[date].totalDeepSleepMinutes += deepSleepMinutes;
    }

    const data = Object.values(aggregation)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => {
        const { totalDeepSleepMinutes, ...rest } = item;
        const percentage =
          item.durationMinutes > 0
            ? Math.round((item.totalDeepSleepMinutes / item.durationMinutes) * 100)
            : 0;
        return {
          ...rest,
          deepSleepPercentage: percentage
        };
      });

    return ok(data);
  } catch (error) {
    const msg = `Fetch Sleep Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'FETCH_SLEEP_FAILED', error));
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
): Promise<Result<ExerciseData[], HealthConnectError>> {
  try {
    const result = await readRecords('ExerciseSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      }
    });

    // キー: "yyyy-MM-dd_ExerciseType"
    const aggregation: { [key: string]: ExerciseData } = {};

    for (const record of result.records) {
      const date = formatDate(record.startTime);
      const type = getExerciseTypeName(record.exerciseType); // IDを名前に変換
      const key = `${date}_${type}`;

      const start = new Date(record.startTime);
      const end = new Date(record.endTime);
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

      if (!aggregation[key]) {
        aggregation[key] = {
          date,
          type,
          durationMinutes: 0
        };
      }

      aggregation[key].durationMinutes += durationMinutes;
    }

    const data = Object.values(aggregation).sort((a, b) => a.date.localeCompare(b.date));
    return ok(data);
  } catch (error) {
    const msg = `Fetch Exercise Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'FETCH_EXERCISE_FAILED', error));
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
): Promise<Result<NutritionData[], HealthConnectError>> {
  try {
    const result = await readRecords('Nutrition', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      }
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
          saturatedFat: 0
        };
      }

      // 安全に加算するためにヘルパー関数を利用（undefined/nullなら0扱い）
      const add = (current: number | undefined, value: number | undefined | null) =>
        (current || 0) + (value || 0);

      aggregation[date].calories = add(aggregation[date].calories, record.energy?.inKilocalories);
      aggregation[date].protein = add(aggregation[date].protein, record.protein?.inGrams);
      aggregation[date].totalFat = add(aggregation[date].totalFat, record.totalFat?.inGrams);
      aggregation[date].totalCarbohydrate = add(
        aggregation[date].totalCarbohydrate,
        record.totalCarbohydrate?.inGrams
      );
      aggregation[date].dietaryFiber = add(
        aggregation[date].dietaryFiber,
        record.dietaryFiber?.inGrams
      );
      aggregation[date].saturatedFat = add(
        aggregation[date].saturatedFat,
        record.saturatedFat?.inGrams
      );
    }

    const data = Object.values(aggregation).sort((a, b) => a.date.localeCompare(b.date));
    return ok(data);
  } catch (error) {
    const msg = `Fetch Nutrition Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'FETCH_NUTRITION_FAILED', error));
  }
}

/**
 * すべてのヘルスデータを取得（変更なし、各fetch関数が日次データを返すようになる）
 */
export async function fetchAllHealthData(startTime: Date, endTime: Date): Promise<HealthData> {
  const [
    stepsResult,
    weightResult,
    bodyFatResult,
    totalCaloriesBurnedResult,
    basalMetabolicRateResult,
    sleepResult,
    exerciseResult,
    nutritionResult
  ] = await Promise.all([
    fetchStepsData(startTime, endTime),
    fetchWeightData(startTime, endTime),
    fetchBodyFatData(startTime, endTime),
    fetchTotalCaloriesData(startTime, endTime),
    fetchBasalMetabolicRateData(startTime, endTime),
    fetchSleepData(startTime, endTime),
    fetchExerciseData(startTime, endTime),
    fetchNutritionData(startTime, endTime)
  ]);

  return {
    steps: stepsResult.unwrapOr([]),
    weight: weightResult.unwrapOr([]),
    bodyFat: bodyFatResult.unwrapOr([]),
    totalCaloriesBurned: totalCaloriesBurnedResult.unwrapOr([]),
    basalMetabolicRate: basalMetabolicRateResult.unwrapOr([]),
    sleep: sleepResult.unwrapOr([]),
    exercise: exerciseResult.unwrapOr([]),
    nutrition: nutritionResult.unwrapOr([])
  };
}

/**
 * Health Connectの設定画面を開く
 */
export function openHealthConnectDataManagement(): void {
  openHealthConnectSettings();
}
