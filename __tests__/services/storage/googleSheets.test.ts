import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as GoogleSheets from '../../../src/services/storage/googleSheets';
import { NetworkError, StorageError } from '../../../src/types/errors';

// js-base64のモック
vi.mock('js-base64', () => ({
  Base64: {
    fromUint8Array: vi.fn(() => 'base64-string')
  }
}));

// debugLogServiceのモック
vi.mock('../../src/services/debugLogService', () => ({
  addDebugLog: vi.fn(),
  logError: vi.fn()
}));

const ACCESS_TOKEN = 'test-token';

describe('GoogleSheets Service', () => {
  // fetchのモック
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
    vi.clearAllMocks();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('findSpreadsheet', () => {
    it('should return spreadsheet ID if found using correct query', async () => {
      // Mock Response
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ files: [{ id: 'sheet-123' }] })
      } as Response);

      const result = await GoogleSheets.findSpreadsheet('MySheet', ACCESS_TOKEN, 'folder-abc');

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe('sheet-123');

      // Verify Query
      // URLエンコードされたクエリを確認するために、デコードしてチェックするか、エンコードされた文字列をチェックする
      // ここでは呼び出し引数を取得してデコードして検証する
      const callArgs = fetchSpy.mock.calls[0];
      const url = callArgs[0] as string;
      const decodedUrl = decodeURIComponent(url);

      expect(decodedUrl).toContain("name='MySheet'");
      expect(decodedUrl).toContain("'folder-abc' in parents");

      expect(callArgs[1]).toEqual(
        expect.objectContaining({
          headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
        })
      );
    });

    it('should return null if not found', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ files: [] })
      } as Response);

      const result = await GoogleSheets.findSpreadsheet('MySheet', ACCESS_TOKEN);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBeNull();
    });

    it('should return NetworkError on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('Network request failed'));

      const result = await GoogleSheets.findSpreadsheet('MySheet', ACCESS_TOKEN);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBeInstanceOf(NetworkError);
    });

    it('should return StorageError on API error (non-200)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found'
      } as Response);

      const result = await GoogleSheets.findSpreadsheet('MySheet', ACCESS_TOKEN);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBeInstanceOf(StorageError);
    });
    it('should return StorageError on general exception', async () => {
      fetchSpy.mockRejectedValue(new Error('Unexpected error'));

      const result = await GoogleSheets.findSpreadsheet('MySheet', ACCESS_TOKEN);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe('FIND_SPREADSHEET_EXCEPTION');
    });
  });

  describe('createSpreadsheet', () => {
    it('should create a spreadsheet and return its ID (no folder move needed)', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ spreadsheetId: 'new-sheet-123' })
      } as Response);

      const result = await GoogleSheets.createSpreadsheet(
        'NewSheet',
        ['Date', 'Steps'],
        ACCESS_TOKEN
      );

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe('new-sheet-123');

      // Verify Body
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://sheets.googleapis.com/v4/spreadsheets',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"title":"NewSheet"')
        })
      );
    });

    it('should create and move spreadsheet if folderId is provided', async () => {
      // 1. Create - Success
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ spreadsheetId: 'new-sheet-123' })
      } as Response);

      // 2. Get Parents - Success
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parents: ['root'] })
      } as Response);

      // 3. Move - Success
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      } as Response);

      const result = await GoogleSheets.createSpreadsheet(
        'NewSheet',
        ['Date'],
        ACCESS_TOKEN,
        'target-folder'
      );

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe('new-sheet-123');

      // Verify Move Call (3rd call)
      expect(fetchSpy).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('addParents=target-folder'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('should fail if move to folder fails', async () => {
      // 1. Create - Success
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ spreadsheetId: 'new-sheet-move-fail' })
      } as Response);

      // 2. Get Parents - Success
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parents: ['root'] })
      } as Response);

      // 3. Move - Fail
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const result = await GoogleSheets.createSpreadsheet(
        'NewSheet',
        ['Date'],
        ACCESS_TOKEN,
        'target-folder'
      );

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe('MOVE_SPREADSHEET_FAILED');
      expect(result.unwrapErr().code).toBe('MOVE_SPREADSHEET_FAILED');
    });

    it('should fail if get file properties for move fails', async () => {
      // 1. Create - Success
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ spreadsheetId: 'new-sheet-get-prop-fail' })
      } as Response);

      // 2. Get Parents - Fail (non-200)
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response);

      const result = await GoogleSheets.createSpreadsheet(
        'NewSheet',
        ['Date'],
        ACCESS_TOKEN,
        'target-folder'
      );

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe('MOVE_SPREADSHEET_FAILED');
      expect(result.unwrapErr().message).toContain('404'); // Message contains status code
    });

    it('should return StorageError (wrapped) if move helper encounters network error', async () => {
      // 1. Create - Success
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ spreadsheetId: 'new-sheet-move-net-fail' })
      } as Response);

      // 2. Get Parents - Network Error
      fetchSpy.mockRejectedValueOnce(new Error('Network request failed'));

      const result = await GoogleSheets.createSpreadsheet(
        'NewSheet',
        ['Date'],
        ACCESS_TOKEN,
        'target-folder'
      );

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBeInstanceOf(StorageError); // Wrapped
      expect(result.unwrapErr().code).toBe('MOVE_SPREADSHEET_FAILED');
      expect(result.unwrapErr().message).toContain('Move spreadsheet network error'); // Inner NetworkError message
    });

    it('should return StorageError (wrapped) if move helper encounters generic exception', async () => {
      // 1. Create - Success
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ spreadsheetId: 'new-sheet-move-ex-fail' })
      } as Response);

      // 2. Get Parents - Generic Error
      fetchSpy.mockRejectedValueOnce(new Error('Move generic error'));

      const result = await GoogleSheets.createSpreadsheet(
        'NewSheet',
        ['Date'],
        ACCESS_TOKEN,
        'target-folder'
      );

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe('MOVE_SPREADSHEET_FAILED');
      expect(result.unwrapErr().message).toContain('Move generic error');
    });

    it('should return NetworkError on network failure during creation', async () => {
      fetchSpy.mockRejectedValue(new Error('Network request failed'));
      const result = await GoogleSheets.createSpreadsheet('NewSheet', [], ACCESS_TOKEN);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBeInstanceOf(NetworkError);
    });

    it('should fail if creation fails', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        text: async () => 'Error creating'
      } as Response);

      const result = await GoogleSheets.createSpreadsheet('NewSheet', [], ACCESS_TOKEN);
      expect(result.isErr()).toBe(true);
    });
    it('should return StorageError on general exception', async () => {
      fetchSpy.mockRejectedValue(new Error('Unexpected create error'));

      const result = await GoogleSheets.createSpreadsheet('MySheet', [], ACCESS_TOKEN);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe('CREATE_SPREADSHEET_EXCEPTION');
    });
  });

  describe('getSheetData', () => {
    it('should return headers and rows', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          values: [
            ['Header1', 'Header2'],
            ['Row1Col1', 'Row1Col2']
          ]
        })
      } as Response);

      const result = await GoogleSheets.getSheetData('sheet-id', ACCESS_TOKEN);

      expect(result.isOk()).toBe(true);
      const data = result.unwrap();
      expect(data.headers).toEqual(['Header1', 'Header2']);
      expect(data.rows).toHaveLength(1);
    });

    it('should return empty arrays if no values', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({})
      } as Response);

      const result = await GoogleSheets.getSheetData('sheet-id', ACCESS_TOKEN);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap().rows).toEqual([]);
    });

    it('should return StorageError on API failure (non-200)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500
      } as Response);
      const result = await GoogleSheets.getSheetData('sheet-id', ACCESS_TOKEN);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBeInstanceOf(StorageError);
    });

    it('should return NetworkError on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('Network request failed'));
      const result = await GoogleSheets.getSheetData('sheet-id', ACCESS_TOKEN);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBeInstanceOf(NetworkError);
    });
    it('should return StorageError on general exception', async () => {
      fetchSpy.mockRejectedValue(new Error('Unexpected get error'));

      const result = await GoogleSheets.getSheetData('sheet-id', ACCESS_TOKEN);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe('GET_SHEET_DATA_EXCEPTION');
    });
  });

  describe('updateHeaders', () => {
    it('should send PUT request to update headers', async () => {
      fetchSpy.mockResolvedValue({ ok: true } as Response);

      const headers = ['A', 'B', 'C'];
      const result = await GoogleSheets.updateHeaders('sheet-id', headers, ACCESS_TOKEN);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(true);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('values/Health Data!A1:C1'),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should return StorageError on API failure (non-200)', async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 400 } as Response);
      const result = await GoogleSheets.updateHeaders('sheet-id', ['A'], ACCESS_TOKEN);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBeInstanceOf(StorageError);
    });

    it('should return NetworkError on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('Network request failed'));
      const result = await GoogleSheets.updateHeaders('sheet-id', ['A'], ACCESS_TOKEN);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBeInstanceOf(NetworkError);
    });
    it('should return StorageError on general exception', async () => {
      fetchSpy.mockRejectedValue(new Error('Unexpected header error'));

      const result = await GoogleSheets.updateHeaders('sheet-id', ['A'], ACCESS_TOKEN);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe('UPDATE_HEADERS_EXCEPTION');
    });
  });

  describe('updateRows', () => {
    it('should send PUT request to update rows', async () => {
      fetchSpy.mockResolvedValue({ ok: true } as Response);

      const rows = [
        ['1', '2'],
        ['3', '4']
      ];
      // startRow=2
      const result = await GoogleSheets.updateRows('sheet-id', 2, rows, ACCESS_TOKEN);

      expect(result.isOk()).toBe(true);

      // rows length is 2, so endRow = 2 + 2 - 1 = 3
      // max col is 2 (B)
      // Range: A2:B3
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('values/Health Data!A2:B3'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"values":[["1","2"],["3","4"]]')
        })
      );
    });

    it('should return ok immediately if rows are empty', async () => {
      const result = await GoogleSheets.updateRows('sheet', 2, [], ACCESS_TOKEN);
      expect(result.isOk()).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
    it('should return StorageError on general exception', async () => {
      fetchSpy.mockRejectedValue(new Error('Unexpected row error'));

      const result = await GoogleSheets.updateRows('sheet-id', 1, [['1']], ACCESS_TOKEN);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe('UPDATE_ROWS_EXCEPTION');
    });

    it('should return StorageError on API failure (non-200)', async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 400 } as Response);
      const result = await GoogleSheets.updateRows('sheet-id', 1, [['test']], ACCESS_TOKEN);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBeInstanceOf(StorageError);
    });

    it('should return NetworkError on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('Network request failed'));
      const result = await GoogleSheets.updateRows('sheet-id', 1, [['test']], ACCESS_TOKEN);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBeInstanceOf(NetworkError);
    });
  });

  describe('fetchPDF', () => {
    it('should fetch PDF and return base64 string', async () => {
      const mockArrayBuffer = new ArrayBuffer(8);
      fetchSpy.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => mockArrayBuffer
      } as Response);

      const result = await GoogleSheets.fetchPDF('sheet-id', ACCESS_TOKEN);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe('base64-string'); // Mocked Base64 return
    });

    it('should return error on failure', async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 500 } as Response);

      const result = await GoogleSheets.fetchPDF('sheet-id', ACCESS_TOKEN);
      expect(result.isErr()).toBe(true);
    });
    it('should return StorageError on general exception', async () => {
      fetchSpy.mockRejectedValue(new Error('Unexpected pdf error'));

      const result = await GoogleSheets.fetchPDF('sheet-id', ACCESS_TOKEN);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().code).toBe('FETCH_PDF_EXCEPTION');
    });

    it('should return NetworkError on network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('Network request failed'));
      const result = await GoogleSheets.fetchPDF('sheet-id', ACCESS_TOKEN);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBeInstanceOf(NetworkError);
    });
  });
});
