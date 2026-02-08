// HealthKit Adapter
// IHealthServiceを実装するiOS用アダプター

import { Linking } from 'react-native';
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
import { addDebugLog } from '../debugLogService';
import * as HealthKit from './healthKit';
import { HealthServiceError, IHealthService } from './types';

/**
 * HealthKit (iOS) 用アダプター実装
 */
export class HealthKitAdapter implements IHealthService {
  async openDataManagement(): Promise<void> {
    const healthAppUrl = 'x-apple-health://';

    try {
      const canOpenHealthApp = await Linking.canOpenURL(healthAppUrl);
      if (canOpenHealthApp) {
        await Linking.openURL(healthAppUrl);
        return;
      }
      await Linking.openSettings();
    } catch (error) {
      await addDebugLog(`[HealthKitAdapter] Failed to open health settings: ${error}`, 'error');
      try {
        await Linking.openSettings();
      } catch {
        // 最終フォールバック失敗時はUI側の処理継続を優先して握りつぶす
      }
    }
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
    // iOSでは追加のランタイム権限は不要。
    // ここでは「自動同期ON時の前提チェック」を共通化するために呼び出す。
    return HealthKit.enableBackgroundDelivery();
  }

  async hasPermissions(): Promise<Result<boolean, HealthServiceError>> {
    const availability = await HealthKit.checkHealthKitAvailability();
    if (!availability.unwrapOr(false)) {
      return ok(false);
    }

    const probe = await HealthKit.probeHealthKitReadPermission();
    if (probe.isOk()) {
      return ok(probe.unwrap());
    }

    // read権限は厳密判定できないため、明確な拒否のみ false とし、
    // それ以外の取得失敗は「判定不能」として true 扱いにする（過剰ブロック回避）。
    return ok(probe.unwrapErr() !== 'permission_denied');
  }
}
