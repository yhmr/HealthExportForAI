import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_DRIVE_CONFIG } from '../../../src/config/driveConfig';
import { STORAGE_KEYS } from '../../../src/config/storageKeys';
import { driveConfigService } from '../../../src/services/config/driveConfig';
import { MockKeyValueStorage } from '../../mocks/MockKeyValueStorage';

describe('DriveConfigService', () => {
  let mockStorage: MockKeyValueStorage;

  beforeEach(() => {
    mockStorage = new MockKeyValueStorage();
    driveConfigService.setStorage(mockStorage);
  });

  it('デフォルト設定をロードできる', async () => {
    const config = await driveConfigService.loadDriveConfig();
    expect(config).toEqual(DEFAULT_DRIVE_CONFIG);
  });

  it('設定を保存してロードできる', async () => {
    const newConfig = {
      ...DEFAULT_DRIVE_CONFIG,
      folderId: 'test-folder-id',
      folderName: 'Test Folder'
    };
    await driveConfigService.saveDriveConfig(newConfig);

    const loadedConfig = await driveConfigService.loadDriveConfig();
    expect(loadedConfig).toEqual(newConfig);

    const storedJson = await mockStorage.getItem(STORAGE_KEYS.DRIVE_CONFIG);
    expect(JSON.parse(storedJson!)).toEqual(newConfig);
  });
});
