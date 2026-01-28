import { HealthData } from '../../types/health';
import { fetchAllHealthData } from '../healthConnect';

/**
 * Health Connectからのデータ取得を担当するクラス
 */
export class Fetcher {
  /**
   * 指定された期間の全てのヘルスデータを取得
   * @param startTime 開始日時
   * @param endTime 終了日時
   */
  async fetchAllData(startTime: Date, endTime: Date): Promise<HealthData> {
    return fetchAllHealthData(startTime, endTime);
  }
}
