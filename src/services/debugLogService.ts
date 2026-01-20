import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    DEBUG_LOG: '@background_sync_debug_log',
} as const;

/** デバッグログの型 */
export interface DebugLogEntry {
    timestamp: string;
    message: string;
    type: 'info' | 'error' | 'success';
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
export async function addDebugLog(message: string, type: 'info' | 'error' | 'success' = 'info'): Promise<void> {
    // コンソールにも出力（開発環境での確認用）
    if (type === 'error') {
        console.error(message);
    } else {
        console.log(message);
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
