import AppleHealthKit, { HealthKitPermissions } from 'react-native-health';
import { Result, err, ok } from '../../types/result';
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
      AppleHealthKit.Constants.Permissions.Workout // 運動データ
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

      // 日付でソート
      stepsData.sort((a, b) => a.date.localeCompare(b.date));

      resolve(ok(stepsData));
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

      // 日付ごとに最新のデータを抽出（HealthConnectの実装に合わせる）
      const dailyMap = new Map<string, { value: number; time: string; timestamp: number }>();

      results.forEach((item) => {
        const date = item.startDate.substring(0, 10);
        const timestamp = new Date(item.startDate).getTime();

        if (!dailyMap.has(date) || timestamp > dailyMap.get(date)!.timestamp) {
          dailyMap.set(date, {
            value: item.value,
            time: new Date(item.startDate).toISOString(), // timeフィールドを追加
            timestamp
          });
        }
      });

      const weightData = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          value: data.value,
          unit: 'kg' as const,
          time: data.time
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

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

      const dailyMap = new Map<string, { value: number; time: string; timestamp: number }>();

      results.forEach((item) => {
        const date = item.startDate.substring(0, 10);
        const timestamp = new Date(item.startDate).getTime();

        if (!dailyMap.has(date) || timestamp > dailyMap.get(date)!.timestamp) {
          dailyMap.set(date, {
            // HealthKitのBodyFatPercentageは0.0〜1.0の範囲で返される (e.g., 0.20 = 20%)
            // 表示用に100倍してパーセント値に変換
            value: item.value * 100,
            time: new Date(item.startDate).toISOString(),
            timestamp
          });
        }
      });

      const bodyFatData = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          percentage: data.value,
          time: data.time
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

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

      const dailyMap = new Map<string, number>();

      results.forEach((item) => {
        const date = item.startDate.substring(0, 10);
        const current = dailyMap.get(date) || 0;
        dailyMap.set(date, current + item.value);
      });

      const caloriesData = Array.from(dailyMap.entries())
        .map(([date, value]) => ({
          date,
          value: Number(value.toFixed(2)),
          unit: 'kcal' as const
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

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

      // BMRも日次で集計する必要があるが、最新の値を取るか合計するか
      // HealthConnect実装では「最新の値」を採用している
      const dailyMap = new Map<string, { value: number; time: string; timestamp: number }>();

      results.forEach((item) => {
        const date = item.startDate.substring(0, 10);
        const timestamp = new Date(item.startDate).getTime();

        // 最新の値を採用
        if (!dailyMap.has(date) || timestamp > dailyMap.get(date)!.timestamp) {
          dailyMap.set(date, {
            value: item.value,
            time: new Date(item.startDate).toISOString(),
            timestamp
          });
        }
      });

      const bmrData = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          value: data.value,
          unit: 'kcal/day' as const,
          time: data.time
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

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

      // 日付ごとの集計
      const dailyMap = new Map<string, { totalMinutes: number; deepMinutes: number }>();

      results.forEach((item) => {
        const date = item.startDate.substring(0, 10);
        // value: 'INBED', 'ASLEEP', 'AWAKE' など (ライブラリのバージョンによる)
        // 通常は value が 'ASLEEP' または 'CORE' などをカウント
        const durationMsg =
          (new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / (1000 * 60);

        if (!dailyMap.has(date)) {
          dailyMap.set(date, { totalMinutes: 0, deepMinutes: 0 });
        }
        const data = dailyMap.get(date)!;

        // ASLEEPの判定 (文字列または定数)
        // HealthKitでは 'ASLEEP' が一般的な睡眠
        if (
          item.value === 'ASLEEP' ||
          item.value === 'CORE' ||
          item.value === 'REM' ||
          item.value === 'DEEP'
        ) {
          data.totalMinutes += durationMsg;
        }

        if (item.value === 'DEEP') {
          data.deepMinutes += durationMsg;
        }
      });

      const sleepData = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          durationMinutes: Math.round(data.totalMinutes),
          deepSleepPercentage:
            data.totalMinutes > 0
              ? Number(((data.deepMinutes / data.totalMinutes) * 100).toFixed(1))
              : 0
        }))
        .filter((d) => d.durationMinutes > 0)
        .sort((a, b) => a.date.localeCompare(b.date));

      resolve(ok(sleepData));
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
      // 日付順
      exerciseList.sort((a, b) => a.date.localeCompare(b.date));
      resolve(ok(exerciseList));
    });
  });
};

/**
 * 栄養データを取得
 * TODO: HealthKitの栄養データ (DietaryEnergyConsumed, DietaryProtein等) の取得を実装
 * 現時点ではデータ構造の複雑さから未実装
 */
export const fetchNutritionData = async (
  _startTime: Date,
  _endTime: Date
): Promise<Result<any[], HealthKitError>> => {
  // TODO: 栄養データの取得を実装
  return ok([]);
};
