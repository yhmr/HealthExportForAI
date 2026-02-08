import AppleHealthKit, { type HealthInputOptions } from 'react-native-health';
import { type NutritionData } from '../../../types/health';
import { err, ok, type Result } from '../../../types/result';
import { sortByDate } from '../../../utils/healthAggregation';
import { addDebugLog } from '../../debugLogService';
import { type HealthKitError, type HealthKitQueryOptions } from './types';

// 栄養は API ごとに返却形が微妙に異なるため、まずここで吸収してから集約する。
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

function parseNutritionSamples(samples: HealthKitNutritionSample[]): ParsedNutritionSample[] {
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
}

function toInputOptions(options: HealthKitQueryOptions): HealthInputOptions {
  return options as unknown as HealthInputOptions;
}

function queryNutritionSamples(
  metricName: string,
  query: (
    options: HealthInputOptions,
    callback: (error: string, results: HealthKitNutritionSample[]) => void
  ) => void,
  options: HealthKitQueryOptions
): Promise<{ success: boolean; samples: ParsedNutritionSample[] }> {
  return new Promise((resolve) => {
    query(toInputOptions(options), (error: string, results: HealthKitNutritionSample[]) => {
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
}

export const fetchNutritionData = async (
  startTime: Date,
  endTime: Date
): Promise<Result<NutritionData[], HealthKitError>> => {
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

  // すべて失敗ならエラー扱い。一部成功は「部分データあり」として返す。
  if (
    ![
      energyResult,
      proteinResult,
      totalFatResult,
      carbsResult,
      fiberResult,
      saturatedFatResult
    ].some((result) => result.success)
  ) {
    return err('fetch_error');
  }

  const dailyMap = new Map<string, NutritionData>();

  // 日付ごとに対象栄養素を加算。
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

  return ok(sortByDate(Array.from(dailyMap.values())));
};
