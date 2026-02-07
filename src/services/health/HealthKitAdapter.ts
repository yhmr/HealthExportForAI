// HealthKit Adapter
// IHealthServiceを実装するiOS用アダプター

import {
  BasalMetabolicRateData,
  BodyFatData,
  CaloriesData,
  ExerciseData,
  NutritionData,
  SleepData,
  StepsData,
  WeightData
} from '../../types/health';
import { Result, ok } from '../../types/result';
import { HealthServiceError, IHealthService } from './types';

import * as HealthKit from './healthKit';

/**
 * HealthKit (iOS) 用アダプター実装
 */
export class HealthKitAdapter implements IHealthService {
  async openDataManagement(): Promise<void> {
    // TODO: iOS では x-apple-health:// スキームでヘルスケアアプリを開くことを検討
    // 現時点では対応するDeep Linkが公式にサポートされていないため未実装
    console.log('openDataManagement not implemented for iOS');
  }

  async checkAvailability(): Promise<Result<boolean, HealthServiceError>> {
    const result = await HealthKit.checkHealthKitAvailability();
    return result.mapErr(() => 'not_available' as HealthServiceError);
  }

  async initialize(): Promise<Result<boolean, HealthServiceError>> {
    const result = await HealthKit.initializeHealthKit();
    return result.mapErr(() => 'init_failed' as HealthServiceError);
  }

  async fetchSteps(start: Date, end: Date): Promise<Result<StepsData[], HealthServiceError>> {
    return (await HealthKit.fetchStepsData(start, end)).mapErr(
      (_e: unknown) => 'fetch_error' as HealthServiceError
    );
  }

  async fetchWeight(start: Date, end: Date): Promise<Result<WeightData[], HealthServiceError>> {
    return (await HealthKit.fetchWeightData(start, end)).mapErr(
      (_e: unknown) => 'fetch_error' as HealthServiceError
    );
  }

  async fetchBodyFat(start: Date, end: Date): Promise<Result<BodyFatData[], HealthServiceError>> {
    return (await HealthKit.fetchBodyFatData(start, end)).mapErr(
      (_e: unknown) => 'fetch_error' as HealthServiceError
    );
  }

  async fetchTotalCalories(
    start: Date,
    end: Date
  ): Promise<Result<CaloriesData[], HealthServiceError>> {
    return (await HealthKit.fetchTotalCaloriesData(start, end)).mapErr(
      (_e: unknown) => 'fetch_error' as HealthServiceError
    );
  }

  async fetchBasalMetabolicRate(
    start: Date,
    end: Date
  ): Promise<Result<BasalMetabolicRateData[], HealthServiceError>> {
    return (await HealthKit.fetchBasalMetabolicRateData(start, end)).mapErr(
      (_e: unknown) => 'fetch_error' as HealthServiceError
    );
  }

  async fetchSleep(start: Date, end: Date): Promise<Result<SleepData[], HealthServiceError>> {
    return (await HealthKit.fetchSleepData(start, end)).mapErr(
      (_e: unknown) => 'fetch_error' as HealthServiceError
    );
  }

  async fetchExercise(start: Date, end: Date): Promise<Result<ExerciseData[], HealthServiceError>> {
    return (await HealthKit.fetchExerciseData(start, end)).mapErr(
      (_e: unknown) => 'fetch_error' as HealthServiceError
    );
  }

  async fetchNutrition(
    start: Date,
    end: Date
  ): Promise<Result<NutritionData[], HealthServiceError>> {
    return (await HealthKit.fetchNutritionData(start, end)).mapErr(
      (_e: unknown) => 'fetch_error' as HealthServiceError
    );
  }

  async requestPermissions(): Promise<Result<boolean, HealthServiceError>> {
    // iOSではinitializeの一部として行われるが、明示的なリクエストとしてinitializeを呼ぶ
    return this.initialize();
  }

  async requestBackgroundPermission(): Promise<Result<boolean, HealthServiceError>> {
    // iOSではバックグラウンド権限はInfo.plistとCapabilitiesで静的に決まるため、常に成功扱い
    return ok(true);
  }

  async hasPermissions(): Promise<Result<boolean, HealthServiceError>> {
    // NOTE: iOSのHealthKitでは、ユーザーが権限を拒否したかどうかを
    // アプリ側から直接確認することはできない（プライバシー保護の設計）。
    // initializeHealthKit が成功すれば、少なくとも一部の権限は付与されていると見なす。
    return ok(true);
  }
}
