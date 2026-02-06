import { Platform } from 'react-native';
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
import { Result, err, ok } from '../../types/result';

// HealthConnectの実装をインポート
import * as HealthConnect from './healthConnect';
// HealthKitの実装をインポート
import * as HealthKit from './healthKit';

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

/**
 * 実装クラス: Platformに応じて委譲先を切り替える
 */
class HealthServiceAdapter implements IHealthService {
  async openDataManagement(): Promise<void> {
    if (Platform.OS === 'android') {
      await HealthConnect.openHealthConnectDataManagement();
    } else {
      // TODO: iOS では x-apple-health:// スキームでヘルスケアアプリを開くことを検討
      // 現時点では対応するDeep Linkが公式にサポートされていないため未実装
      console.log('openDataManagement not implemented for iOS');
    }
  }

  async checkAvailability(): Promise<Result<boolean, HealthServiceError>> {
    if (Platform.OS === 'android') {
      const result = await HealthConnect.checkHealthConnectAvailability();
      return result.map((v) => v.available).mapErr(() => 'not_available' as HealthServiceError);
    } else if (Platform.OS === 'ios') {
      const result = await HealthKit.checkHealthKitAvailability();
      return result.mapErr(() => 'not_available' as HealthServiceError);
    }
    return err('not_supported');
  }

  async initialize(): Promise<Result<boolean, HealthServiceError>> {
    if (Platform.OS === 'android') {
      const result = await HealthConnect.initializeHealthConnect();
      return result.mapErr(() => 'init_failed' as HealthServiceError);
    } else if (Platform.OS === 'ios') {
      const result = await HealthKit.initializeHealthKit();
      return result.mapErr(() => 'init_failed' as HealthServiceError);
    }
    return err('not_supported');
  }

  async fetchSteps(start: Date, end: Date): Promise<Result<StepsData[], HealthServiceError>> {
    if (Platform.OS === 'android') {
      return (await HealthConnect.fetchStepsData(start, end)).mapErr(
        (_e: unknown) => 'fetch_error'
      );
    } else if (Platform.OS === 'ios') {
      return (await HealthKit.fetchStepsData(start, end)).mapErr((_e: unknown) => 'fetch_error');
    }
    return ok([]);
  }

  async fetchWeight(start: Date, end: Date): Promise<Result<WeightData[], HealthServiceError>> {
    if (Platform.OS === 'android') {
      return (await HealthConnect.fetchWeightData(start, end)).mapErr(
        (_e: unknown) => 'fetch_error'
      );
    } else if (Platform.OS === 'ios') {
      return (await HealthKit.fetchWeightData(start, end)).mapErr((_e: unknown) => 'fetch_error');
    }
    return ok([]);
  }

  async fetchBodyFat(start: Date, end: Date): Promise<Result<BodyFatData[], HealthServiceError>> {
    if (Platform.OS === 'android') {
      return (await HealthConnect.fetchBodyFatData(start, end)).mapErr(
        (_e: unknown) => 'fetch_error'
      );
    } else if (Platform.OS === 'ios') {
      return (await HealthKit.fetchBodyFatData(start, end)).mapErr((_e: unknown) => 'fetch_error');
    }
    return ok([]);
  }

  async fetchTotalCalories(
    start: Date,
    end: Date
  ): Promise<Result<CaloriesData[], HealthServiceError>> {
    if (Platform.OS === 'android') {
      return (await HealthConnect.fetchTotalCaloriesData(start, end)).mapErr(
        (_e: unknown) => 'fetch_error'
      );
    } else if (Platform.OS === 'ios') {
      return (await HealthKit.fetchTotalCaloriesData(start, end)).mapErr(
        (_e: unknown) => 'fetch_error'
      );
    }
    return ok([]);
  }

  async fetchBasalMetabolicRate(
    start: Date,
    end: Date
  ): Promise<Result<BasalMetabolicRateData[], HealthServiceError>> {
    if (Platform.OS === 'android') {
      return (await HealthConnect.fetchBasalMetabolicRateData(start, end)).mapErr(
        (_e: unknown) => 'fetch_error'
      );
    } else if (Platform.OS === 'ios') {
      return (await HealthKit.fetchBasalMetabolicRateData(start, end)).mapErr(
        (_e: unknown) => 'fetch_error'
      );
    }
    return ok([]);
  }

  async fetchSleep(start: Date, end: Date): Promise<Result<SleepData[], HealthServiceError>> {
    if (Platform.OS === 'android') {
      return (await HealthConnect.fetchSleepData(start, end)).mapErr(
        (_e: unknown) => 'fetch_error'
      );
    } else if (Platform.OS === 'ios') {
      return (await HealthKit.fetchSleepData(start, end)).mapErr((_e: unknown) => 'fetch_error');
    }
    return ok([]);
  }

  async fetchExercise(start: Date, end: Date): Promise<Result<ExerciseData[], HealthServiceError>> {
    if (Platform.OS === 'android') {
      return (await HealthConnect.fetchExerciseData(start, end)).mapErr(
        (_e: unknown) => 'fetch_error'
      );
    } else if (Platform.OS === 'ios') {
      return (await HealthKit.fetchExerciseData(start, end)).mapErr((_e: unknown) => 'fetch_error');
    }
    return ok([]);
  }

  async fetchNutrition(
    start: Date,
    end: Date
  ): Promise<Result<NutritionData[], HealthServiceError>> {
    if (Platform.OS === 'android') {
      return (await HealthConnect.fetchNutritionData(start, end)).mapErr(
        (_e: unknown) => 'fetch_error'
      );
    } else if (Platform.OS === 'ios') {
      return (await HealthKit.fetchNutritionData(start, end)).mapErr(
        (_e: unknown) => 'fetch_error'
      );
    }
    return ok([]);
  }

  async requestPermissions(): Promise<Result<boolean, HealthServiceError>> {
    if (Platform.OS === 'android') {
      return (await HealthConnect.requestHealthPermissions()).mapErr(
        (_e: unknown) => 'permission_denied'
      );
    } else if (Platform.OS === 'ios') {
      // iOSではinitializeの一部として行われるが、明示的なリクエストとしてinitializeを呼ぶ
      return this.initialize();
    }
    return ok(false);
  }

  async requestBackgroundPermission(): Promise<Result<boolean, HealthServiceError>> {
    if (Platform.OS === 'android') {
      return (await HealthConnect.requestBackgroundHealthPermission()).mapErr(
        (_e: unknown) => 'permission_denied'
      );
    } else if (Platform.OS === 'ios') {
      // iOSではバックグラウンド権限はInfo.plistとCapabilitiesで静的に決まるため、常に成功扱い
      // または必要に応じてチェックロジックを入れる
      return ok(true);
    }
    return ok(false);
  }

  async hasPermissions(): Promise<Result<boolean, HealthServiceError>> {
    if (Platform.OS === 'android') {
      return (await HealthConnect.checkHealthPermissions()).mapErr(
        () => 'permission_denied' as HealthServiceError
      );
    } else if (Platform.OS === 'ios') {
      // NOTE: iOSのHealthKitでは、ユーザーが権限を拒否したかどうかを
      // アプリ側から直接確認することはできない（プライバシー保護の設計）。
      // initializeHealthKit が成功すれば、少なくとも一部の権限は付与されていると見なす。
      // 個別データの取得時にエラーが発生した場合は、そのデータ種別の権限がない可能性がある。
      return ok(true);
    }
    return ok(false);
  }
}

export const healthService = new HealthServiceAdapter();
