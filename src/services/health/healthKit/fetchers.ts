import AppleHealthKit, { type HealthInputOptions, type HealthValue } from 'react-native-health';
import { err, ok, type Result } from '../../../types/result';
import {
  aggregateByLatestPerDay,
  reduceByDate,
  sortByDate
} from '../../../utils/healthAggregation';
import { addDebugLog } from '../../debugLogService';
import { type HealthKitError, type HealthKitQueryOptions } from './types';

// Sleep API は value が文字列ステージで返るため、専用型を用意して意図を明示する。
interface SleepSample {
  startDate: string;
  endDate: string;
  value: string | number;
}

type WorkoutSample = Partial<HealthValue> & {
  start?: string;
  end?: string;
  activityName?: string;
  duration?: number;
};

// ライブラリ定義では option.type の表現が不足しているため、内部でのみ変換する。
function toInputOptions(options: HealthKitQueryOptions): HealthInputOptions {
  return options as unknown as HealthInputOptions;
}

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
    AppleHealthKit.getDailyStepCountSamples(options, (error: string, results: HealthValue[]) => {
      if (error) {
        void addDebugLog(`[HealthKit] fetchSteps error: ${error}`, 'error');
        resolve(err('fetch_error'));
        return;
      }

      const stepsData = results.map((item) => ({
        date: item.startDate.substring(0, 10),
        count: item.value
      }));

      resolve(ok(sortByDate(stepsData)));
    });
  });
};

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
    AppleHealthKit.getWeightSamples(
      toInputOptions(options),
      (error: string, results: HealthValue[]) => {
        if (error) {
          void addDebugLog(`[HealthKit] fetchWeight error: ${error}`, 'error');
          resolve(err('fetch_error'));
          return;
        }

        // 同日の複数計測は最新時刻の値を採用（HealthConnect側と揃える）。
        const weightData = aggregateByLatestPerDay(
          results,
          (item) => item.startDate,
          (item, date) => ({
            date,
            value: item.value,
            unit: 'kg' as const,
            time: new Date(item.startDate).toISOString()
          })
        );

        resolve(ok(weightData));
      }
    );
  });
};

export const fetchBodyFatData = async (
  startTime: Date,
  endTime: Date
): Promise<Result<{ date: string; percentage: number; time: string }[], HealthKitError>> => {
  const options: HealthKitQueryOptions = {
    startDate: startTime.toISOString(),
    endDate: endTime.toISOString()
  };

  return new Promise((resolve) => {
    AppleHealthKit.getBodyFatPercentageSamples(
      toInputOptions(options),
      (error: string, results: HealthValue[]) => {
        if (error) {
          void addDebugLog(`[HealthKit] fetchBodyFat error: ${error}`, 'error');
          resolve(err('fetch_error'));
          return;
        }

        const bodyFatData = aggregateByLatestPerDay(
          results,
          (item) => item.startDate,
          (item, date) => ({
            date,
            // HealthKitは0.0-1.0で返るため%表示値に合わせる。
            percentage: item.value * 100,
            time: new Date(item.startDate).toISOString()
          })
        );

        resolve(ok(bodyFatData));
      }
    );
  });
};

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
    AppleHealthKit.getActiveEnergyBurned(
      toInputOptions(options),
      (error: string, results: HealthValue[]) => {
        if (error) {
          void addDebugLog(`[HealthKit] fetchTotalCalories error: ${error}`, 'error');
          resolve(err('fetch_error'));
          return;
        }

        // 1日内の複数レコードを合算する。
        const caloriesData = reduceByDate(
          results,
          (item) => item.startDate,
          (date) => ({
            date,
            value: 0,
            unit: 'kcal' as const
          }),
          (current, item) => {
            current.value += item.value;
          }
        ).map((item) => ({
          ...item,
          value: Number(item.value.toFixed(2))
        }));

        resolve(ok(caloriesData));
      }
    );
  });
};

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
    AppleHealthKit.getBasalEnergyBurned(
      toInputOptions(options),
      (error: string, results: HealthValue[]) => {
        if (error) {
          void addDebugLog(`[HealthKit] fetchBMR error: ${error}`, 'error');
          resolve(err('fetch_error'));
          return;
        }

        // BMRは日次代表値として最新計測を採用する。
        const bmrData = aggregateByLatestPerDay(
          results,
          (item) => item.startDate,
          (item, date) => ({
            date,
            value: item.value,
            unit: 'kcal/day' as const,
            time: new Date(item.startDate).toISOString()
          })
        );

        resolve(ok(bmrData));
      }
    );
  });
};

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
    AppleHealthKit.getSleepSamples(options, (error: string, results: HealthValue[]) => {
      if (error) {
        void addDebugLog(`[HealthKit] fetchSleep error: ${error}`, 'error');
        resolve(err('fetch_error'));
        return;
      }

      const sleepResults = results as unknown as SleepSample[];

      // 睡眠はステージを日次集約し、最終的に深睡眠割合を算出する。
      const sleepData = reduceByDate(
        sleepResults,
        (item) => item.startDate,
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
        .filter((item) => item.durationMinutes > 0);

      resolve(ok(sortByDate(sleepData)));
    });
  });
};

export const fetchExerciseData = async (
  startTime: Date,
  endTime: Date
): Promise<Result<{ date: string; type: string; durationMinutes: number }[], HealthKitError>> => {
  const options: HealthKitQueryOptions = {
    startDate: startTime.toISOString(),
    endDate: endTime.toISOString(),
    type: 'Workout'
  };

  return new Promise((resolve) => {
    AppleHealthKit.getSamples(toInputOptions(options), (error: string, results: HealthValue[]) => {
      if (error) {
        void addDebugLog(`[HealthKit] fetchExercise error: ${error}`, 'error');
        resolve(err('fetch_error'));
        return;
      }

      const workoutResults = results as unknown as WorkoutSample[];
      const exerciseList: { date: string; type: string; durationMinutes: number }[] = [];

      // getSamples('Workout') の返却形が端末/バージョン差異を含むため、
      // startDate/start と endDate/end の両方に対応して正規化する。
      workoutResults.forEach((item) => {
        const start = item.startDate ?? item.start;
        const end = item.endDate ?? item.end;
        if (!start) {
          return;
        }

        const type = typeof item.activityName === 'string' ? item.activityName : 'other';
        const durationSeconds =
          typeof item.duration === 'number'
            ? item.duration
            : end
              ? Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 1000)
              : 0;

        exerciseList.push({
          date: String(start).substring(0, 10),
          type: type.replace('HKWorkoutActivityType', '').toLowerCase(),
          durationMinutes: parseFloat((durationSeconds / 60).toFixed(1))
        });
      });

      resolve(ok(sortByDate(exerciseList)));
    });
  });
};
