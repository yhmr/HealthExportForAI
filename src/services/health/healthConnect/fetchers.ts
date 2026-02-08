import { aggregateGroupByDuration, readRecords } from 'react-native-health-connect';
import { HealthConnectError } from '../../../types/errors';
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
} from '../../../types/health';
import { err, ok, type Result } from '../../../types/result';
import { formatDate } from '../../../utils/formatters';
import {
  aggregateByLatestPerDay,
  reduceByDate,
  sortByDate
} from '../../../utils/healthAggregation';
import { addDebugLog } from '../../debugLogService';
import { getExerciseTypeName } from './constants';

// ここは「HealthConnect生データ -> アプリ共通HealthData型」への変換レイヤー。
// 各関数は失敗時もResultで返し、上位で部分成功を扱える設計にしている。

export async function fetchStepsData(
  startTime: Date,
  endTime: Date
): Promise<Result<StepsData[], HealthConnectError>> {
  try {
    // Steps/Calories は SDK集計APIを使うと重複ソースが自然に統合される。
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

    const stepsData: StepsData[] = result.map((item) => ({
      date: formatDate(item.startTime),
      count: item.result.COUNT_TOTAL ?? 0
    }));

    return ok(sortByDate(stepsData));
  } catch (error) {
    const msg = `Fetch Steps Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'FETCH_STEPS_FAILED', error));
  }
}

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

    // 1日1値に正規化するため、同日は最新計測のみ採用。
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

export async function fetchTotalCaloriesData(
  startTime: Date,
  endTime: Date
): Promise<Result<CaloriesData[], HealthConnectError>> {
  try {
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

    const caloriesData: CaloriesData[] = result.map((item) => ({
      date: formatDate(item.startTime),
      value: item.result.ENERGY_TOTAL?.inKilocalories ?? 0,
      unit: 'kcal' as const
    }));

    return ok(sortByDate(caloriesData));
  } catch (error) {
    const msg = `Fetch Calories Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'FETCH_CALORIES_FAILED', error));
  }
}

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

    type SleepAggregation = SleepData & { totalDeepSleepMinutes: number };
    // 睡眠は終了日基準で日次化し、深睡眠分を別集計して割合算出に使う。
    const aggregated = reduceByDate(
      result.records,
      (record) => record.endTime,
      (date): SleepAggregation => ({
        date,
        durationMinutes: 0,
        totalDeepSleepMinutes: 0
      }),
      (current, record) => {
        const start = new Date(record.startTime);
        const end = new Date(record.endTime);
        current.durationMinutes += Math.round((end.getTime() - start.getTime()) / 60000);

        if (!record.stages) {
          return;
        }

        for (const stage of record.stages) {
          const stageType = stage.stage as number | string;
          if (stageType !== 5 && stageType !== 'DEEP') {
            continue;
          }

          const stageStart = new Date(stage.startTime);
          const stageEnd = new Date(stage.endTime);
          current.totalDeepSleepMinutes += (stageEnd.getTime() - stageStart.getTime()) / 60000;
        }
      }
    );

    const data = aggregated.map((item) => {
      const percentage =
        item.durationMinutes > 0
          ? Math.round((item.totalDeepSleepMinutes / item.durationMinutes) * 100)
          : 0;
      return {
        date: item.date,
        durationMinutes: item.durationMinutes,
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

    // 同日・同種目で合算するため、date + type をキーに集計する。
    const aggregation: Record<string, ExerciseData> = {};

    for (const record of result.records) {
      const date = formatDate(record.startTime);
      const type = getExerciseTypeName(record.exerciseType);
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

    return ok(sortByDate(Object.values(aggregation)));
  } catch (error) {
    const msg = `Fetch Exercise Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'FETCH_EXERCISE_FAILED', error));
  }
}

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

    const add = (current: number | undefined, value: number | undefined | null) =>
      (current || 0) + (value || 0);

    // 栄養素は欠損があり得るため、undefined/null を0扱いで日次加算する。
    const data = reduceByDate(
      result.records,
      (record) => record.startTime,
      (date): NutritionData => ({
        date,
        calories: 0,
        protein: 0,
        totalFat: 0,
        totalCarbohydrate: 0,
        dietaryFiber: 0,
        saturatedFat: 0
      }),
      (current, record) => {
        current.calories = add(current.calories, record.energy?.inKilocalories);
        current.protein = add(current.protein, record.protein?.inGrams);
        current.totalFat = add(current.totalFat, record.totalFat?.inGrams);
        current.totalCarbohydrate = add(
          current.totalCarbohydrate,
          record.totalCarbohydrate?.inGrams
        );
        current.dietaryFiber = add(current.dietaryFiber, record.dietaryFiber?.inGrams);
        current.saturatedFat = add(current.saturatedFat, record.saturatedFat?.inGrams);
      }
    );

    return ok(data);
  } catch (error) {
    const msg = `Fetch Nutrition Error: ${error}`;
    await addDebugLog(`[HealthConnect] ${msg}`, 'error');
    return err(new HealthConnectError(msg, 'FETCH_NUTRITION_FAILED', error));
  }
}

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
