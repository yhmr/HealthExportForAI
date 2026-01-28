import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/storageKeys';

import { AppError } from '../types/errors';

/** デバッグログの型 */
export interface DebugLogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success' | 'warn';
}

/**
 * デバッグログを取得
 */
export async function loadDebugLogs(): Promise<DebugLogEntry[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.DEBUG_LOG);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

/**
 * デバッグログを追加（最大50件保持）
 * 同時にコンソールにも出力する
 */
export async function addDebugLog(
  message: string,
  type: 'info' | 'error' | 'success' | 'warn' = 'info'
): Promise<void> {
  // コンソールにも出力（開発環境での確認用）
  if (__DEV__) {
    if (type === 'error') {
      console.error(message);
    } else if (type === 'warn') {
      console.warn(message);
    } else {
      console.log(message);
    }
  }

  try {
    const currentLogs = await loadDebugLogs();
    const newLog: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      message,
      type
    };
    const updatedLogs = [newLog, ...currentLogs].slice(0, 50);
    await AsyncStorage.setItem(STORAGE_KEYS.DEBUG_LOG, JSON.stringify(updatedLogs));
  } catch (error) {
    console.error('Failed to save debug log:', error);
  }
}

/**
 * デバッグログをクリア
 */
export async function clearDebugLogs(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.DEBUG_LOG);
}

/**
 * エラーをログに記録するヘルパー
 */
export async function logError(error: unknown): Promise<void> {
  let message: string;
  if (error instanceof AppError) {
    message = error.toString();
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }
  await addDebugLog(message, 'error');
}
