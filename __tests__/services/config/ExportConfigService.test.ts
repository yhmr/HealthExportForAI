import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_EXPORT_FORMATS } from '../../../src/config/driveConfig';
import { STORAGE_KEYS } from '../../../src/config/storageKeys';
import { exportConfigService } from '../../../src/services/config/ExportConfigService';
import { MockKeyValueStorage } from '../../mocks/MockKeyValueStorage';

describe('ExportConfigService', () => {
  let mockStorage: MockKeyValueStorage;

  beforeEach(() => {
    mockStorage = new MockKeyValueStorage();
    exportConfigService.setStorage(mockStorage);
  });

  it('デフォルトのエクスポート形式をロードできる', async () => {
    const formats = await exportConfigService.loadExportFormats();
    expect(formats).toEqual(DEFAULT_EXPORT_FORMATS);
  });

  it('エクスポート形式を保存してロードできる', async () => {
    const formats = ['csv', 'json'] as any;
    await exportConfigService.saveExportFormats(formats);

    const loadedFormats = await exportConfigService.loadExportFormats();
    expect(loadedFormats).toEqual(formats);

    const storedJson = await mockStorage.getItem(STORAGE_KEYS.EXPORT_FORMATS);
    expect(JSON.parse(storedJson!)).toEqual(formats);
  });

  it('PDF形式が古いデータに含まれていても除外されること', async () => {
    // 古いデータ構造をシミュレート ('pdf' が含まれている)
    await mockStorage.setItem(STORAGE_KEYS.EXPORT_FORMATS, JSON.stringify(['csv', 'pdf', 'json']));

    const loadedFormats = await exportConfigService.loadExportFormats();
    expect(loadedFormats).toEqual(['csv', 'json']);
    expect(loadedFormats).not.toContain('pdf');
  });

  it('セットアップ完了ステータスを保存・ロードできる', async () => {
    await exportConfigService.saveIsSetupCompleted(true);
    let completed = await exportConfigService.loadIsSetupCompleted();
    expect(completed).toBe(true);
    expect(await mockStorage.getItem(STORAGE_KEYS.IS_SETUP_COMPLETED)).toBe('true');

    await exportConfigService.saveIsSetupCompleted(false);
    completed = await exportConfigService.loadIsSetupCompleted();
    expect(completed).toBe(false);
    expect(await mockStorage.getItem(STORAGE_KEYS.IS_SETUP_COMPLETED)).toBe('false');
  });
});
