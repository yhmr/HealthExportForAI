// オフラインキュー ストレージサービス
// AsyncStorageを使用してエクスポート待ちデータを永続化

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OfflineQueueData, PendingExport } from '../../types/offline';

import { addDebugLog } from '../debugLogService';

/** AsyncStorageのキー */
const STORAGE_KEY = '@offline_queue';

/** 最大リトライ回数 */
export const MAX_RETRY_COUNT = 3;

/**
 * UUIDを生成（簡易版）
 * React Nativeでは crypto.randomUUID() が使えない場合があるため
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * キューデータを読み込み
 * @returns キューデータ（存在しない場合は空のキュー）
 */
async function loadQueue(): Promise<OfflineQueueData> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json) {
      return JSON.parse(json) as OfflineQueueData;
    }
  } catch (error) {
    await addDebugLog(`[OfflineQueue] Failed to load queue: ${error}`, 'error');
  }
  return { pending: [], updatedAt: new Date().toISOString() };
}

/**
 * キューデータを保存
 * @param data 保存するキューデータ
 */
async function saveQueue(data: OfflineQueueData): Promise<void> {
  try {
    data.updatedAt = new Date().toISOString();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    await addDebugLog(`[OfflineQueue] Failed to save queue: ${error}`, 'error');
    throw error;
  }
}

/**
 * 新しいエクスポートをキューに追加
 * @param entry エクスポートデータ（id, createdAt, retryCountは自動生成）
 * @returns 生成されたエントリのID
 */
export async function addToQueue(
  entry: Omit<PendingExport, 'id' | 'createdAt' | 'retryCount'>
): Promise<string> {
  const queue = await loadQueue();

  const newEntry: PendingExport = {
    ...entry,
    id: generateUUID(),
    createdAt: new Date().toISOString(),
    retryCount: 0
  };

  queue.pending.push(newEntry);
  await saveQueue(queue);

  await addDebugLog(
    `[OfflineQueue] Added entry ${newEntry.id} to queue. Total: ${queue.pending.length}`,
    'info'
  );
  return newEntry.id;
}

/**
 * キューからエントリを削除
 * @param id 削除するエントリのID
 */
export async function removeFromQueue(id: string): Promise<void> {
  const queue = await loadQueue();
  const beforeCount = queue.pending.length;

  queue.pending = queue.pending.filter((entry) => entry.id !== id);
  await saveQueue(queue);

  await addDebugLog(
    `[OfflineQueue] Removed entry ${id}. Before: ${beforeCount}, After: ${queue.pending.length}`,
    'info'
  );
}

/**
 * キュー内の全エントリを取得
 * @returns 待機中のエクスポートリスト（作成日時順）
 */
export async function getQueue(): Promise<PendingExport[]> {
  const queue = await loadQueue();
  // 作成日時の早い順にソート
  return queue.pending.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/**
 * キュー内のエントリ数を取得
 * @returns 待機中のエントリ数
 */
export async function getQueueCount(): Promise<number> {
  const queue = await loadQueue();
  return queue.pending.length;
}

/**
 * キューをクリア
 */
export async function clearQueue(): Promise<void> {
  await saveQueue({ pending: [], updatedAt: new Date().toISOString() });
  await addDebugLog('[OfflineQueue] Queue cleared', 'info');
}

/**
 * エントリのリトライ回数をインクリメントし、エラーを記録
 * @param id エントリID
 * @param error エラーメッセージ
 */
export async function incrementRetry(id: string, error: string): Promise<void> {
  const queue = await loadQueue();
  const entry = queue.pending.find((e) => e.id === id);

  if (entry) {
    entry.retryCount += 1;
    entry.lastError = error;
    await saveQueue(queue);
    await addDebugLog(
      `[OfflineQueue] Entry ${id} retry count: ${entry.retryCount}/${MAX_RETRY_COUNT}`,
      'info'
    );
  }
}

/**
 * 最大リトライ回数に達したエントリかどうか
 * @param entry エントリ
 * @returns 最大リトライ回数に達している場合true
 */
export function hasExceededMaxRetries(entry: PendingExport): boolean {
  return entry.retryCount >= MAX_RETRY_COUNT;
}

/**
 * 最初のエントリを取得（キューの先頭）
 * @returns 最初のエントリ、またはキューが空の場合null
 */
export async function peekQueue(): Promise<PendingExport | null> {
  const queue = await getQueue();
  return queue.length > 0 ? queue[0] : null;
}
