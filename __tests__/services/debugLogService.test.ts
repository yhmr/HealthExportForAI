import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addDebugLog, clearDebugLogs, loadDebugLogs } from '../../src/services/debugLogService';

// AsyncStorageのモック
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn()
  }
}));

describe('Debug Log Service', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    vi.clearAllMocks();

    // 簡易的なIn-Memory Storageとして振る舞うようにモック実装を設定
    (AsyncStorage.getItem as any).mockImplementation((key: string) => {
      return Promise.resolve(mockStorage[key] || null);
    });
    (AsyncStorage.setItem as any).mockImplementation((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    });
    (AsyncStorage.removeItem as any).mockImplementation((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    });
  });

  describe('addDebugLog', () => {
    it('should save a log that can be retrieved', async () => {
      const message = 'Test Log Message';
      const type = 'info';

      await addDebugLog(message, type);

      // 直接モック呼び出しを確認するのではなく、loadDebugLogsを使って
      // 「保存されたものが読めるか」を確認する（ブラックボックステスト）
      const logs = await loadDebugLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual(
        expect.objectContaining({
          message,
          type,
          timestamp: expect.any(String) // タイムスタンプは動的なので型のみ確認
        })
      );
    });

    it('should maintain max 50 logs (FIFO)', async () => {
      // 50件のログを投入
      const logs = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        message: `Log ${i}`,
        type: 'info'
      }));
      // 初期状態としてセット
      mockStorage['@background_sync_debug_log'] = JSON.stringify(logs);

      // 51件目を追加
      await addDebugLog('New Log Entry', 'error');

      const currentLogs = await loadDebugLogs();

      expect(currentLogs).toHaveLength(50);
      expect(currentLogs[0].message).toBe('New Log Entry'); // 最新が先頭
      expect(currentLogs[49].message).toBe('Log 48'); // 一番古い 'Log 49' が消え、'Log 48' が最後になる
    });

    it('should handle error gracefully without crashing', async () => {
      const originalConsoleError = console.error;
      console.error = vi.fn();

      // 特定のケースでのみエラーを発生させる
      (AsyncStorage.setItem as any).mockRejectedValueOnce(new Error('Storage Full'));

      await expect(addDebugLog('Log that fails', 'info')).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalled();
      console.error = originalConsoleError;
    });
  });

  describe('loadDebugLogs', () => {
    it('should return empty array when no logs exist', async () => {
      const logs = await loadDebugLogs();
      expect(logs).toEqual([]);
    });

    it('should return empty array when storage data is corrupted', async () => {
      mockStorage['@background_sync_debug_log'] = '{ invalid json ...';
      const logs = await loadDebugLogs();
      expect(logs).toEqual([]);
    });
  });

  describe('clearDebugLogs', () => {
    it('should remove all logs', async () => {
      mockStorage['@background_sync_debug_log'] = JSON.stringify([{ message: 'log' }]);

      await clearDebugLogs();

      const logs = await loadDebugLogs();
      expect(logs).toEqual([]);
      expect(mockStorage['@background_sync_debug_log']).toBeUndefined();
    });
  });
});
