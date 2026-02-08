import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../../../src/config/storageKeys';
import { backgroundSyncConfigService } from '../../../src/services/config/BackgroundSyncConfigService';
import { DEFAULT_AUTO_SYNC_CONFIG } from '../../../src/types/export';
import { MockKeyValueStorage } from '../../mocks/MockKeyValueStorage';

describe('BackgroundSyncConfigService', () => {
  let mockStorage: MockKeyValueStorage;

  beforeEach(() => {
    mockStorage = new MockKeyValueStorage();
    // サービスのストレージをモックに差し替え
    backgroundSyncConfigService.setStorage(mockStorage);
  });

  it('デフォルト設定を正しくロードできる', async () => {
    const config = await backgroundSyncConfigService.loadBackgroundSyncConfig();
    expect(config).toEqual(DEFAULT_AUTO_SYNC_CONFIG);
  });

  it('設定を保存してロードできる', async () => {
    const newConfig = { ...DEFAULT_AUTO_SYNC_CONFIG, intervalMinutes: 60 }; // Valid interval
    await backgroundSyncConfigService.saveBackgroundSyncConfig(newConfig as any); // work around strict type check if needed, but 60 should be valid

    const loadedConfig = await backgroundSyncConfigService.loadBackgroundSyncConfig();
    expect(loadedConfig).toEqual(newConfig);

    // ストレージに正しく書き込まれているか確認
    const storedJson = await mockStorage.getItem(STORAGE_KEYS.BACKGROUND_SYNC_CONFIG);
    expect(storedJson).toBeDefined();
    expect(JSON.parse(storedJson!)).toEqual(newConfig);
  });

  it('LastSyncTimeを取得できる', async () => {
    const testTime = new Date().toISOString();
    await mockStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, testTime);

    const loadedTime = await backgroundSyncConfigService.loadLastBackgroundSync();
    expect(loadedTime).toBe(testTime);
  });

  it('壊れたJSONや不正なintervalの場合はデフォルト設定を返す', async () => {
    await mockStorage.setItem(STORAGE_KEYS.BACKGROUND_SYNC_CONFIG, '{invalid');
    expect(await backgroundSyncConfigService.loadBackgroundSyncConfig()).toEqual(
      DEFAULT_AUTO_SYNC_CONFIG
    );

    await mockStorage.setItem(
      STORAGE_KEYS.BACKGROUND_SYNC_CONFIG,
      JSON.stringify({ enabled: true, intervalMinutes: 7, wifiOnly: true })
    );
    expect(await backgroundSyncConfigService.loadBackgroundSyncConfig()).toEqual(
      DEFAULT_AUTO_SYNC_CONFIG
    );
  });
});
