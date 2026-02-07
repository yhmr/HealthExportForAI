// ヘルスサービス共通型定義

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

/**
 * ヘルスケアサービスの共通エラー型
 */
export type HealthServiceError =
  | 'not_available'
  | 'permission_denied'
  | 'init_failed'
  | 'fetch_error'
  | 'not_supported';

/**
 * データ取得の共通インターフェース
 */
export interface IHealthService {
  /**
   * 利用可否チェック
   */
  checkAvailability(): Promise<Result<boolean, HealthServiceError>>;

  /**
   * 初期化（権限リクエスト含む）
   */
  initialize(): Promise<Result<boolean, HealthServiceError>>;

  // 各種データ取得
  fetchSteps(start: Date, end: Date): Promise<Result<StepsData[], HealthServiceError>>;
  fetchWeight(start: Date, end: Date): Promise<Result<WeightData[], HealthServiceError>>;
  fetchBodyFat(start: Date, end: Date): Promise<Result<BodyFatData[], HealthServiceError>>;
  fetchTotalCalories(start: Date, end: Date): Promise<Result<CaloriesData[], HealthServiceError>>;
  fetchBasalMetabolicRate(
    start: Date,
    end: Date
  ): Promise<Result<BasalMetabolicRateData[], HealthServiceError>>;
  fetchSleep(start: Date, end: Date): Promise<Result<SleepData[], HealthServiceError>>;
  fetchExercise(start: Date, end: Date): Promise<Result<ExerciseData[], HealthServiceError>>;
  fetchNutrition(start: Date, end: Date): Promise<Result<NutritionData[], HealthServiceError>>;

  requestPermissions(): Promise<Result<boolean, HealthServiceError>>;
  requestBackgroundPermission(): Promise<Result<boolean, HealthServiceError>>;
  hasPermissions(): Promise<Result<boolean, HealthServiceError>>;
  openDataManagement(): Promise<void>;
}
