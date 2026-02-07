// HealthConnect Adapter
// IHealthServiceを実装するAndroid用アダプター

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
import { Result } from '../../types/result';
import { HealthServiceError, IHealthService } from './types';

import * as HealthConnect from './healthConnect';

/**
 * Health Connect (Android) 用アダプター実装
 */
export class HealthConnectAdapter implements IHealthService {
  async openDataManagement(): Promise<void> {
    await HealthConnect.openHealthConnectDataManagement();
  }

  async checkAvailability(): Promise<Result<boolean, HealthServiceError>> {
    const result = await HealthConnect.checkHealthConnectAvailability();
    return result.map((v) => v.available).mapErr(() => 'not_available' as HealthServiceError);
  }

  async initialize(): Promise<Result<boolean, HealthServiceError>> {
    const result = await HealthConnect.initializeHealthConnect();
    return result.mapErr(() => 'init_failed' as HealthServiceError);
  }

  async fetchSteps(start: Date, end: Date): Promise<Result<StepsData[], HealthServiceError>> {
    return (await HealthConnect.fetchStepsData(start, end)).mapErr(
      (_e: unknown) => 'fetch_error' as HealthServiceError
    );
  }

  async fetchWeight(start: Date, end: Date): Promise<Result<WeightData[], HealthServiceError>> {
    return (await HealthConnect.fetchWeightData(start, end)).mapErr(
      (_e: unknown) => 'fetch_error' as HealthServiceError
    );
  }

  async fetchBodyFat(start: Date, end: Date): Promise<Result<BodyFatData[], HealthServiceError>> {
    return (await HealthConnect.fetchBodyFatData(start, end)).mapErr(
      (_e: unknown) => 'fetch_error' as HealthServiceError
    );
  }

  async fetchTotalCalories(
    start: Date,
    end: Date
  ): Promise<Result<CaloriesData[], HealthServiceError>> {
    return (await HealthConnect.fetchTotalCaloriesData(start, end)).mapErr(
      (_e: unknown) => 'fetch_error' as HealthServiceError
    );
  }

  async fetchBasalMetabolicRate(
    start: Date,
    end: Date
  ): Promise<Result<BasalMetabolicRateData[], HealthServiceError>> {
    return (await HealthConnect.fetchBasalMetabolicRateData(start, end)).mapErr(
      (_e: unknown) => 'fetch_error' as HealthServiceError
    );
  }

  async fetchSleep(start: Date, end: Date): Promise<Result<SleepData[], HealthServiceError>> {
    return (await HealthConnect.fetchSleepData(start, end)).mapErr(
      (_e: unknown) => 'fetch_error' as HealthServiceError
    );
  }

  async fetchExercise(start: Date, end: Date): Promise<Result<ExerciseData[], HealthServiceError>> {
    return (await HealthConnect.fetchExerciseData(start, end)).mapErr(
      (_e: unknown) => 'fetch_error' as HealthServiceError
    );
  }

  async fetchNutrition(
    start: Date,
    end: Date
  ): Promise<Result<NutritionData[], HealthServiceError>> {
    return (await HealthConnect.fetchNutritionData(start, end)).mapErr(
      (_e: unknown) => 'fetch_error' as HealthServiceError
    );
  }

  async requestPermissions(): Promise<Result<boolean, HealthServiceError>> {
    return (await HealthConnect.requestHealthPermissions()).mapErr(
      (_e: unknown) => 'permission_denied' as HealthServiceError
    );
  }

  async requestBackgroundPermission(): Promise<Result<boolean, HealthServiceError>> {
    return (await HealthConnect.requestBackgroundHealthPermission()).mapErr(
      (_e: unknown) => 'permission_denied' as HealthServiceError
    );
  }

  async hasPermissions(): Promise<Result<boolean, HealthServiceError>> {
    return (await HealthConnect.checkHealthPermissions()).mapErr(
      () => 'permission_denied' as HealthServiceError
    );
  }
}
