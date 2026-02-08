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

  it('壊れたエクスポート形式JSONの場合はデフォルトにフォールバックする', async () => {
    await mockStorage.setItem(STORAGE_KEYS.EXPORT_FORMATS, '{invalid');
    const loadedFormats = await exportConfigService.loadExportFormats();
    expect(loadedFormats).toEqual(DEFAULT_EXPORT_FORMATS);
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

  it('最終同期日時を保存・取得・削除できる', async () => {
    const time = '2023-01-01T12:00:00Z';

    // Save
    await exportConfigService.saveLastSyncTime(time);
    expect(await exportConfigService.loadLastSyncTime()).toBe(time);
    expect(await mockStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME)).toBe(time);

    // Remove
    await exportConfigService.removeLastSyncTime();
    expect(await exportConfigService.loadLastSyncTime()).toBeNull();
    expect(await mockStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME)).toBeNull();
  });

  it('エクスポート期間（日数）を保存・取得できる', async () => {
    // Default
    expect(await exportConfigService.loadExportPeriodDays()).toBe(7);

    // Save & Load
    await exportConfigService.saveExportPeriodDays(30);
    expect(await exportConfigService.loadExportPeriodDays()).toBe(30);
    expect(await mockStorage.getItem(STORAGE_KEYS.EXPORT_PERIOD_DAYS)).toBe('30');
  });

  it('SpreadsheetのPDF出力オプションを保存・取得できる', async () => {
    // Save
    await exportConfigService.saveExportSheetAsPdf(true);
    expect(await exportConfigService.loadExportSheetAsPdf()).toBe(true);
    expect(await mockStorage.getItem(STORAGE_KEYS.EXPORT_SHEET_AS_PDF)).toBe('true');

    await exportConfigService.saveExportSheetAsPdf(false);
    expect(await exportConfigService.loadExportSheetAsPdf()).toBe(false);
    expect(await mockStorage.getItem(STORAGE_KEYS.EXPORT_SHEET_AS_PDF)).toBe('false');
  });

  it('選択されたデータタグを保存・取得できる', async () => {
    // Default (null)
    expect(await exportConfigService.loadSelectedDataTags()).toBeNull();

    // Save & Load
    const tags = ['steps', 'weight'];
    await exportConfigService.saveSelectedDataTags(tags);
    expect(await exportConfigService.loadSelectedDataTags()).toEqual(tags);
    expect(await mockStorage.getItem(STORAGE_KEYS.SELECTED_DATA_TAGS)).toBe(JSON.stringify(tags));
  });

  it('壊れたタグJSONの場合はnullを返す', async () => {
    await mockStorage.setItem(STORAGE_KEYS.SELECTED_DATA_TAGS, '{invalid');
    expect(await exportConfigService.loadSelectedDataTags()).toBeNull();
  });
});
