import AppleHealthKit, { HealthKitPermissions } from 'react-native-health';
import { NutritionData } from '../../types/health';
import { Result, err, ok } from '../../types/result';
import { aggregateByLatestPerDay, reduceByDate, sortByDate } from '../../utils/healthAggregation';
import { addDebugLog } from '../debugLogService';
import { HealthServiceError } from './types';

/**
 * HealthKitのエラー型
 */
export type HealthKitError = 'not_available' | 'permission_denied' | 'init_failed' | 'fetch_error';

/**
 * HealthKit API用のオプション型定義
 * Note: react-native-healthのHealthInputOptionsは実際のAPIと型定義に不整合があるため
 * (例: HealthUnitに'kg'がない、HealthObserverに必要な値がない)、独自の型を定義して使用
 */
interface HealthKitQueryOptions {
  startDate: string;
  endDate: string;
  unit?: string;
  includeManuallyAdded?: boolean;
  type?: string;
}

/**
 * HealthKitのアクセス権限設定
 */
const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.BodyFatPercentage,
      AppleHealthKit.Constants.Permissions.BasalEnergyBurned,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.Workout, // 運動データ
      AppleHealthKit.Constants.Permissions.EnergyConsumed,
      AppleHealthKit.Constants.Permissions.Protein,
      AppleHealthKit.Constants.Permissions.FatTotal,
      AppleHealthKit.Constants.Permissions.Carbohydrates,
      AppleHealthKit.Constants.Permissions.Fiber,
      AppleHealthKit.Constants.Permissions.FatSaturated
    ],
    write: [] // 書き込みは行わない
  }
};

const PERMISSION_ERROR_PATTERNS = [
  'authorization',
  'not authorized',
  'permission',
  'denied',
  'not permitted'
];

function isLikelyPermissionError(error: unknown): boolean {
  const message = String(error).toLowerCase();
  return PERMISSION_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

/**
 * HealthKitの初期化と権限リクエストを行う
 */
export const initializeHealthKit = async (): Promise<Result<boolean, HealthKitError>> => {
  try {
    const isAvailable = await new Promise<boolean>((resolve, reject) => {
      AppleHealthKit.isAvailable((err: object, available: boolean) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(available);
      });
    });

    if (!isAvailable) {
      await addDebugLog('[HealthKit] HealthKit is not available on this device', 'error');
      return err('not_available');
    }

    // 権限リクエスト
    // initHealthKit は権限ダイアログを表示する
    await new Promise<void>((resolve, reject) => {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          reject(new Error(error));
          return;
        }
        resolve();
      });
    });
    await addDebugLog('[HealthKit] Initialization successful', 'info');
    return ok(true);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await addDebugLog(`[HealthKit] Initialization failed: ${errorMsg}`, 'error');
    return err('init_failed');
  }
};

/**
 * バックグラウンド配信を有効化する (iOS)
 * 指定された権限（現状は全read権限を想定）に対して監視を有効にする
 */
export const enableBackgroundDelivery = async (): Promise<Result<boolean, HealthServiceError>> => {
  try {
    const read = permissions.permissions.read;
    if (read.length > 0) {
      for (const permission of read) {
        // すべての読み取り権限に対してバックグラウンド配信を有効化
        // react-native-healthの型定義不足のためanyキャストを使用
        (AppleHealthKit as any).enableBackgroundDelivery(
          {
            type: permission,
            frequency: 'hourly' // 'hourly', 'immediate', 'daily', etc.
          },
          (error: string) => {
            if (error) {
              addDebugLog(
                `[HealthKit] Failed to enable background delivery for ${permission}: ${error}`,
                'warn'
              );
            }
          }
        );
      }
      await addDebugLog('[HealthKit] Background delivery enabled', 'info');
      return ok(true);
    }
    return ok(false); // 対象なし
  } catch (bgError) {
    await addDebugLog(`[HealthKit] Background delivery setup error: ${bgError}`, 'warn');
    return err('not_available'); // 厳密なエラー定義がないので仮置き
  }
};

/**
 * HealthKitの利用可否をチェック
 */
export const checkHealthKitAvailability = async (): Promise<Result<boolean, HealthKitError>> => {
  return new Promise((resolve) => {
    AppleHealthKit.isAvailable((error: object, available: boolean) => {
      if (error) {
        resolve(err('not_available'));
        return;
      }
      resolve(ok(available));
    });
  });
};

/**
 * HealthKitの読み取り権限を推定チェック
 * iOS仕様上、read権限の厳密判定はできないため、軽量な読み取りを実行して
 * 権限エラーらしき応答のみを permission_denied として扱う。
 */
export const probeHealthKitReadPermission = async (): Promise<Result<boolean, HealthKitError>> => {
  const endTime = new Date();
  const startTime = new Date(endTime);
  startTime.setDate(startTime.getDate() - 1);

  const options = {
    startDate: startTime.toISOString(),
    endDate: endTime.toISOString(),
    includeManuallyAdded: true
  };

  return new Promise((resolve) => {
    AppleHealthKit.getDailyStepCountSamples(options, (error: unknown) => {
      if (!error) {
        resolve(ok(true));
        return;
      }

      if (isLikelyPermissionError(error)) {
        resolve(err('permission_denied'));
        return;
      }

      addDebugLog(`[HealthKit] Permission probe failed: ${String(error)}`, 'warn');
      resolve(err('fetch_error'));
    });
  });
};

/**
 * 歩数データを取得
 */
export const fetchStepsData = async (
  startTime: Date,
  endTime: Date
): Promise<Result<{ date: string; count: number }[], HealthKitError>> => {
  const options = {
    startDate: startTime.toISOString(),
    endDate: endTime.toISOString(),
    includeManuallyAdded: true
  };

  return new Promise((resolve) => {
    AppleHealthKit.getDailyStepCountSamples(options, (error: string, results: any[]) => {
      if (error) {
        addDebugLog(`[HealthKit] fetchSteps error: ${error}`, 'error');
        resolve(err('fetch_error'));
        return;
      }

      // 結果をStepsData形式に変換
      // react-native-healthのgetDailyStepCountSamplesは { value, startDate, endDate } の配列を返す
      const stepsData = results.map((item) => ({
        date: item.startDate.substring(0, 10), // YYYY-MM-DD
        count: item.value
      }));

      resolve(ok(sortByDate(stepsData)));
    });
  });
};

/**
 * 体重データを取得
 */
export const fetchWeightData = async (
  startTime: Date,
  endTime: Date
): Promise<Result<{ date: string; value: number; unit: 'kg'; time: string }[], HealthKitError>> => {
  const options: HealthKitQueryOptions = {
    startDate: startTime.toISOString(),
    endDate: endTime.toISOString(),
    unit: 'kg'
  };

  return new Promise((resolve) => {
    // Note: ライブラリの型定義が不完全なためas anyを使用
    AppleHealthKit.getWeightSamples(options as any, (error: string, results: any[]) => {
      if (error) {
        addDebugLog(`[HealthKit] fetchWeight error: ${error}`, 'error');
        resolve(err('fetch_error'));
        return;
      }

      const weightData = aggregateByLatestPerDay(
        results,
        (item) => String(item.startDate),
        (item, date) => ({
          date,
          value: item.value,
          unit: 'kg' as const,
          time: new Date(item.startDate).toISOString()
        })
      );

      resolve(ok(weightData));
    });
  });
};

/**
 * 体脂肪率データを取得
 */
export const fetchBodyFatData = async (
  startTime: Date,
  endTime: Date
): Promise<Result<{ date: string; percentage: number; time: string }[], HealthKitError>> => {
  const options: HealthKitQueryOptions = {
    startDate: startTime.toISOString(),
    endDate: endTime.toISOString()
  };

  return new Promise((resolve) => {
    // Note: ライブラリの型定義が不完全なためas anyを使用
    AppleHealthKit.getBodyFatPercentageSamples(options as any, (error: string, results: any[]) => {
      if (error) {
        addDebugLog(`[HealthKit] fetchBodyFat error: ${error}`, 'error');
        resolve(err('fetch_error'));
        return;
      }

      const bodyFatData = aggregateByLatestPerDay(
        results,
        (item) => String(item.startDate),
        (item, date) => ({
          date,
          // HealthKitのBodyFatPercentageは0.0〜1.0の範囲で返るため100倍する
          percentage: item.value * 100,
          time: new Date(item.startDate).toISOString()
        })
      );

      resolve(ok(bodyFatData));
    });
  });
};

/**
 * 総消費カロリーデータを取得 (Active Energy Burned)
 * ※Health Connectと異なり基礎代謝を含まない可能性があるため注意
 */
export const fetchTotalCaloriesData = async (
  startTime: Date,
  endTime: Date
): Promise<Result<{ date: string; value: number; unit: 'kcal' }[], HealthKitError>> => {
  const options: HealthKitQueryOptions = {
    startDate: startTime.toISOString(),
    endDate: endTime.toISOString(),
    unit: 'kilocalorie'
  };

  return new Promise((resolve) => {
    // Note: ライブラリの型定義が不完全なためas anyを使用
    AppleHealthKit.getActiveEnergyBurned(options as any, (error: string, results: any[]) => {
      if (error) {
        addDebugLog(`[HealthKit] fetchTotalCalories error: ${error}`, 'error');
        resolve(err('fetch_error'));
        return;
      }

      const caloriesData = reduceByDate(
        results,
        (item) => String(item.startDate),
        (date) => ({
          date,
          value: 0,
          unit: 'kcal' as const
        }),
        (current, item) => {
          current.value += Number(item.value) || 0;
        }
      ).map((item) => ({
        ...item,
        value: Number(item.value.toFixed(2))
      }));

      resolve(ok(caloriesData));
    });
  });
};

/**
 * 基礎代謝データを取得
 */
export const fetchBasalMetabolicRateData = async (
  startTime: Date,
  endTime: Date
): Promise<
  Result<{ date: string; value: number; unit: 'kcal/day'; time: string }[], HealthKitError>
> => {
  const options: HealthKitQueryOptions = {
    startDate: startTime.toISOString(),
    endDate: endTime.toISOString(),
    unit: 'kilocalorie'
  };

  return new Promise((resolve) => {
    // Note: ライブラリの型定義が不完全なためas anyを使用
    AppleHealthKit.getBasalEnergyBurned(options as any, (error: string, results: any[]) => {
      if (error) {
        addDebugLog(`[HealthKit] fetchBMR error: ${error}`, 'error');
        resolve(err('fetch_error'));
        return;
      }

      const bmrData = aggregateByLatestPerDay(
        results,
        (item) => String(item.startDate),
        (item, date) => ({
          date,
          value: item.value,
          unit: 'kcal/day' as const,
          time: new Date(item.startDate).toISOString()
        })
      );

      resolve(ok(bmrData));
    });
  });
};

/**
 * 睡眠データを取得
 */
export const fetchSleepData = async (
  startTime: Date,
  endTime: Date
): Promise<
  Result<{ date: string; durationMinutes: number; deepSleepPercentage?: number }[], HealthKitError>
> => {
  const options = {
    startDate: startTime.toISOString(),
    endDate: endTime.toISOString()
  };

  return new Promise((resolve) => {
    AppleHealthKit.getSleepSamples(options, (error: string, results: any[]) => {
      if (error) {
        addDebugLog(`[HealthKit] fetchSleep error: ${error}`, 'error');
        resolve(err('fetch_error'));
        return;
      }

      const sleepData = reduceByDate(
        results,
        (item) => String(item.startDate),
        (date) => ({
          date,
          totalMinutes: 0,
          deepMinutes: 0
        }),
        (current, item) => {
          const durationMinutes =
            (new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / (1000 * 60);

          const isAsleepStage =
            item.value === 'ASLEEP' ||
            item.value === 'CORE' ||
            item.value === 'REM' ||
            item.value === 'DEEP';

          if (isAsleepStage) {
            current.totalMinutes += durationMinutes;
          }
          if (item.value === 'DEEP') {
            current.deepMinutes += durationMinutes;
          }
        }
      )
        .map((item) => ({
          date: item.date,
          durationMinutes: Math.round(item.totalMinutes),
          deepSleepPercentage:
            item.totalMinutes > 0
              ? Number(((item.deepMinutes / item.totalMinutes) * 100).toFixed(1))
              : 0
        }))
        .filter((d) => d.durationMinutes > 0);

      resolve(ok(sortByDate(sleepData)));
    });
  });
};

/**
 * 運動データを取得
 */
export const fetchExerciseData = async (
  startTime: Date,
  endTime: Date
): Promise<Result<{ date: string; type: string; durationMinutes: number }[], HealthKitError>> => {
  const options = {
    startDate: startTime.toISOString(),
    endDate: endTime.toISOString()
  };

  return new Promise((resolve) => {
    const workoutOptions: HealthKitQueryOptions = {
      ...options,
      type: 'Workout'
    };
    // Note: ライブラリの型定義が不完全なためas anyを使用
    AppleHealthKit.getSamples(workoutOptions as any, (error: string, results: any[]) => {
      if (error) {
        // Workout取得エラーは許容するか、あるいは0件として扱うか
        addDebugLog(`[HealthKit] fetchExercise error: ${error}`, 'error');
        resolve(err('fetch_error'));
        return;
      }

      const exerciseList: { date: string; type: string; durationMinutes: number }[] = [];

      results.forEach((item) => {
        const start = item.startDate ?? item.start;
        const end = item.endDate ?? item.end;
        if (!start) {
          return;
        }

        // activityName または activityId から運動種別を判別
        const type = typeof item.activityName === 'string' ? item.activityName : 'other';
        // duration（秒）がなければ start/end から補完
        const durationSeconds =
          typeof item.duration === 'number'
            ? item.duration
            : end
              ? Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 1000)
              : 0;
        const durationMinutes = parseFloat((durationSeconds / 60).toFixed(1));

        exerciseList.push({
          date: String(start).substring(0, 10),
          type: type.replace('HKWorkoutActivityType', '').toLowerCase(),
          durationMinutes
        });
      });
      resolve(ok(sortByDate(exerciseList)));
    });
  });
};

/**
 * 栄養データを取得（日次合計）
 */
export const fetchNutritionData = async (
  startTime: Date,
  endTime: Date
): Promise<Result<NutritionData[], HealthKitError>> => {
  interface HealthKitNutritionSample {
    startDate?: unknown;
    start?: unknown;
    value?: unknown;
    quantity?: unknown;
  }

  interface ParsedNutritionSample {
    date: string;
    value: number;
  }

  type NutritionMetricKey =
    | 'calories'
    | 'protein'
    | 'totalFat'
    | 'totalCarbohydrate'
    | 'dietaryFiber'
    | 'saturatedFat';

  const parseNutritionSamples = (samples: HealthKitNutritionSample[]): ParsedNutritionSample[] => {
    return samples
      .map((sample): ParsedNutritionSample | null => {
        const rawDate =
          typeof sample.startDate === 'string'
            ? sample.startDate
            : typeof sample.start === 'string'
              ? sample.start
              : null;
        if (!rawDate) return null;

        const rawValue = sample.value ?? sample.quantity;
        const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);
        if (!Number.isFinite(value)) return null;

        return {
          date: rawDate.substring(0, 10),
          value
        };
      })
      .filter((sample): sample is ParsedNutritionSample => sample !== null);
  };

  const queryNutritionSamples = (
    metricName: string,
    query: (
      options: HealthKitQueryOptions,
      callback: (error: string, results: HealthKitNutritionSample[]) => void
    ) => void,
    options: HealthKitQueryOptions
  ): Promise<{ success: boolean; samples: ParsedNutritionSample[] }> => {
    return new Promise((resolve) => {
      query(options, (error: string, results: HealthKitNutritionSample[]) => {
        if (error) {
          void addDebugLog(`[HealthKit] fetchNutrition ${metricName} error: ${error}`, 'warn');
          resolve({ success: false, samples: [] });
          return;
        }
        resolve({
          success: true,
          samples: parseNutritionSamples(Array.isArray(results) ? results : [])
        });
      });
    });
  };

  const baseOptions: HealthKitQueryOptions = {
    startDate: startTime.toISOString(),
    endDate: endTime.toISOString()
  };
  const gramOptions: HealthKitQueryOptions = { ...baseOptions, unit: 'gram' };
  const kcalOptions: HealthKitQueryOptions = { ...baseOptions, unit: 'kilocalorie' };

  const [
    energyResult,
    proteinResult,
    totalFatResult,
    carbsResult,
    fiberResult,
    saturatedFatResult
  ] = await Promise.all([
    queryNutritionSamples('energy', AppleHealthKit.getEnergyConsumedSamples, kcalOptions),
    queryNutritionSamples('protein', AppleHealthKit.getProteinSamples, gramOptions),
    queryNutritionSamples('totalFat', AppleHealthKit.getTotalFatSamples, gramOptions),
    queryNutritionSamples('carbohydrates', AppleHealthKit.getCarbohydratesSamples, gramOptions),
    queryNutritionSamples('dietaryFiber', AppleHealthKit.getFiberSamples, gramOptions),
    queryNutritionSamples('saturatedFat', AppleHealthKit.getSamples, {
      ...gramOptions,
      type: 'FatSaturated'
    })
  ]);

  const queryResults = [
    energyResult,
    proteinResult,
    totalFatResult,
    carbsResult,
    fiberResult,
    saturatedFatResult
  ];

  if (!queryResults.some((result) => result.success)) {
    return err('fetch_error');
  }

  const dailyMap = new Map<string, NutritionData>();

  const aggregate = (samples: ParsedNutritionSample[], field: NutritionMetricKey) => {
    for (const sample of samples) {
      const current = dailyMap.get(sample.date) ?? { date: sample.date };
      current[field] = (current[field] || 0) + sample.value;
      dailyMap.set(sample.date, current);
    }
  };

  aggregate(energyResult.samples, 'calories');
  aggregate(proteinResult.samples, 'protein');
  aggregate(totalFatResult.samples, 'totalFat');
  aggregate(carbsResult.samples, 'totalCarbohydrate');
  aggregate(fiberResult.samples, 'dietaryFiber');
  aggregate(saturatedFatResult.samples, 'saturatedFat');

  const data = sortByDate(Array.from(dailyMap.values()));
  return ok(data);
};
