import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../config/storageKeys';
import { OfflineQueueData, PendingExport } from '../../types/exportTypes';
import { addDebugLog } from '../debugLogService';

const STORAGE_KEY = STORAGE_KEYS.OFFLINE_EXPORT_QUEUE;
export const MAX_RETRY_COUNT = 3;

/**
 * エクスポートキューを管理するクラス
 */
export class QueueManager {
  /**
   * 現在のキュー一覧を取得
   */
  async getQueue(): Promise<PendingExport[]> {
    const data = await this.loadQueueData();
    return data.pending;
  }

  /**
   * キューにエクスポートリクエストを追加
   * @returns 追加されたエントリのID
   */
  async addToQueue(
    item: Omit<PendingExport, 'id' | 'createdAt' | 'retryCount'>
  ): Promise<string | null> {
    try {
      const data = await this.loadQueueData();
      const newEntry: PendingExport = {
        ...item,
        id: this.generateUUID(),
        createdAt: new Date().toISOString(),
        retryCount: 0
      };
      data.pending.push(newEntry);
      await this.saveQueueData(data);
      await addDebugLog(`[QueueManager] Added entry ${newEntry.id} to queue`, 'info');
      return newEntry.id;
    } catch (error) {
      await addDebugLog(`[QueueManager] Add failed: ${error}`, 'error');
      return null;
    }
  }

  /**
   * キューからエントリを削除（成功時）
   */
  async removeFromQueue(id: string): Promise<void> {
    try {
      const data = await this.loadQueueData();
      const initialLength = data.pending.length;
      data.pending = data.pending.filter((item) => item.id !== id);

      if (data.pending.length !== initialLength) {
        await this.saveQueueData(data);
        await addDebugLog(`[QueueManager] Removed entry ${id}`, 'info');
      }
    } catch (error) {
      await addDebugLog(`[QueueManager] Remove failed: ${error}`, 'error');
    }
  }

  /**
   * リトライ回数をインクリメントし、エラーを記録
   */
  async incrementRetry(id: string, lastError: string): Promise<void> {
    try {
      const data = await this.loadQueueData();
      const index = data.pending.findIndex((item) => item.id === id);

      if (index !== -1) {
        data.pending[index].retryCount += 1;
        data.pending[index].lastError = lastError;
        await this.saveQueueData(data);
        await addDebugLog(
          `[QueueManager] Incremented retry for ${id} (${data.pending[index].retryCount})`,
          'info'
        );
      }
    } catch (error) {
      await addDebugLog(`[QueueManager] Update retry failed: ${error}`, 'error');
    }
  }

  /**
   * リトライ上限を超えているか判定
   */
  hasExceededMaxRetries(item: PendingExport): boolean {
    return item.retryCount >= MAX_RETRY_COUNT;
  }

  /**
   * キューをクリア（デバッグ用）
   */
  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await addDebugLog('[QueueManager] Queue cleared', 'info');
  }

  // --- Private Methods ---

  /**
   * キューデータを取得（内部用）
   */
  private async loadQueueData(): Promise<OfflineQueueData> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (!json) {
        return { pending: [], updatedAt: new Date().toISOString() };
      }
      return JSON.parse(json);
    } catch (error) {
      await addDebugLog(`[QueueManager] Load failed: ${error}`, 'error');
      return { pending: [], updatedAt: new Date().toISOString() };
    }
  }

  /**
   * キューデータを保存（内部用）
   */
  private async saveQueueData(data: OfflineQueueData): Promise<void> {
    try {
      data.updatedAt = new Date().toISOString();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      await addDebugLog(`[QueueManager] Save failed: ${error}`, 'error');
    }
  }

  /**
   * UUID生成
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

export const queueManager = new QueueManager();
