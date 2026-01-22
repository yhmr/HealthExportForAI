// キューへのアクセス（永続化）レイヤー
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OfflineQueueData, PendingExport } from '../../types/exportTypes';
import { addDebugLog } from '../debugLogService';

// UUIDライブラリへの依存を排除するための簡易実装
// キューID用なので、厳密な暗号学的ランダム性は必須ではないが、十分に衝突しにくいものを使用
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const STORAGE_KEY = 'offline_export_queue';
export const MAX_RETRY_COUNT = 3;

/**
 * キューデータを取得（内部用）
 */
async function loadQueueData(): Promise<OfflineQueueData> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) {
      return { pending: [], updatedAt: new Date().toISOString() };
    }
    return JSON.parse(json);
  } catch (error) {
    await addDebugLog(`[QueueStorage] Load failed: ${error}`, 'error');
    return { pending: [], updatedAt: new Date().toISOString() };
  }
}

/**
 * キューデータを保存（内部用）
 */
async function saveQueueData(data: OfflineQueueData): Promise<void> {
  try {
    data.updatedAt = new Date().toISOString();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    await addDebugLog(`[QueueStorage] Save failed: ${error}`, 'error');
  }
}

/**
 * 現在のキュー一覧を取得
 */
export async function getQueue(): Promise<PendingExport[]> {
  const data = await loadQueueData();
  return data.pending;
}

/**
 * キューにエクスポートリクエストを追加
 * @returns 追加されたエントリのID
 */
export async function addToQueue(
  item: Omit<PendingExport, 'id' | 'createdAt' | 'retryCount'>
): Promise<string | null> {
  try {
    const data = await loadQueueData();
    const newEntry: PendingExport = {
      ...item,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      retryCount: 0
    };
    data.pending.push(newEntry);
    await saveQueueData(data);
    await addDebugLog(`[QueueStorage] Added entry ${newEntry.id} to queue`, 'info');
    return newEntry.id;
  } catch (error) {
    await addDebugLog(`[QueueStorage] Add failed: ${error}`, 'error');
    return null;
  }
}

/**
 * キューからエントリを削除（成功時）
 */
export async function removeFromQueue(id: string): Promise<void> {
  try {
    const data = await loadQueueData();
    const initialLength = data.pending.length;
    data.pending = data.pending.filter((item) => item.id !== id);

    if (data.pending.length !== initialLength) {
      await saveQueueData(data);
      await addDebugLog(`[QueueStorage] Removed entry ${id}`, 'info');
    }
  } catch (error) {
    await addDebugLog(`[QueueStorage] Remove failed: ${error}`, 'error');
  }
}

/**
 * リトライ回数をインクリメントし、エラーを記録
 */
export async function incrementRetry(id: string, lastError: string): Promise<void> {
  try {
    const data = await loadQueueData();
    const index = data.pending.findIndex((item) => item.id === id);

    if (index !== -1) {
      data.pending[index].retryCount += 1;
      data.pending[index].lastError = lastError;
      await saveQueueData(data);
      await addDebugLog(
        `[QueueStorage] Incremented retry for ${id} (${data.pending[index].retryCount})`,
        'info'
      );
    }
  } catch (error) {
    await addDebugLog(`[QueueStorage] Update retry failed: ${error}`, 'error');
  }
}

/**
 * リトライ上限を超えているか判定
 */
export function hasExceededMaxRetries(item: PendingExport): boolean {
  return item.retryCount >= MAX_RETRY_COUNT;
}

/**
 * キューをクリア（デバッグ用）
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  await addDebugLog('[QueueStorage] Queue cleared', 'info');
}
