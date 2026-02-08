import { HealthData } from '../../types/health';
import { addDebugLog } from '../debugLogService';
import { healthService } from './healthAdapterFactory';

/**
 * Health SDKからのデータ取得を担当するクラス
 */
export class Fetcher {
  /**
   * 指定された期間の全てのヘルスデータを取得
   * @param startTime 開始日時
   * @param endTime 終了日時
   */
  async fetchAllData(startTime: Date, endTime: Date): Promise<HealthData> {
    const [
      stepsResult,
      weightResult,
      bodyFatResult,
      caloriesResult,
      bmrResult,
      sleepResult,
      exerciseResult,
      nutritionResult
    ] = await Promise.all([
      healthService.fetchSteps(startTime, endTime),
      healthService.fetchWeight(startTime, endTime),
      healthService.fetchBodyFat(startTime, endTime),
      healthService.fetchTotalCalories(startTime, endTime),
      healthService.fetchBasalMetabolicRate(startTime, endTime),
      healthService.fetchSleep(startTime, endTime),
      healthService.fetchExercise(startTime, endTime),
      healthService.fetchNutrition(startTime, endTime)
    ]);

    // エラー時はログを出力して空配列を使用（部分的なデータ取得を許容）
    if (stepsResult.isErr())
      await addDebugLog(`fetchSteps failed: ${stepsResult.unwrapErr()}`, 'warn');
    if (weightResult.isErr())
      await addDebugLog(`fetchWeight failed: ${weightResult.unwrapErr()}`, 'warn');
    if (bodyFatResult.isErr())
      await addDebugLog(`fetchBodyFat failed: ${bodyFatResult.unwrapErr()}`, 'warn');
    if (caloriesResult.isErr())
      await addDebugLog(`fetchCalories failed: ${caloriesResult.unwrapErr()}`, 'warn');
    if (bmrResult.isErr()) await addDebugLog(`fetchBMR failed: ${bmrResult.unwrapErr()}`, 'warn');
    if (sleepResult.isErr())
      await addDebugLog(`fetchSleep failed: ${sleepResult.unwrapErr()}`, 'warn');
    if (exerciseResult.isErr())
      await addDebugLog(`fetchExercise failed: ${exerciseResult.unwrapErr()}`, 'warn');
    if (nutritionResult.isErr())
      await addDebugLog(`fetchNutrition failed: ${nutritionResult.unwrapErr()}`, 'warn');

    return {
      steps: stepsResult.unwrapOr([]),
      weight: weightResult.unwrapOr([]),
      bodyFat: bodyFatResult.unwrapOr([]),
      totalCaloriesBurned: caloriesResult.unwrapOr([]),
      basalMetabolicRate: bmrResult.unwrapOr([]),
      sleep: sleepResult.unwrapOr([]),
      exercise: exerciseResult.unwrapOr([]),
      nutrition: nutritionResult.unwrapOr([])
    };
  }
}
