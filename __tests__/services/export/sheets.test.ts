import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportToSpreadsheet } from '../../../src/services/export/sheets';
import { err, ok } from '../../../src/types/result';
import { SpreadsheetAdapter } from '../../../src/types/storage';

// Mock debugLogService
vi.mock('../../../src/services/debugLogService', () => ({
  addDebugLog: vi.fn()
}));

// Mock SpreadsheetAdapter
const mockSpreadsheetAdapter = {
  findSpreadsheet: vi.fn(),
  createSpreadsheet: vi.fn(),
  getSheetData: vi.fn(),
  updateHeaders: vi.fn(),
  updateRows: vi.fn(),
  fetchPDF: vi.fn()
} as unknown as SpreadsheetAdapter;

// Mock Health Data
const mockHealthData = {
  steps: [{ date: '2025-01-01', count: 5000 }],
  weight: [],
  bodyFat: [],
  totalCaloriesBurned: [],
  basalMetabolicRate: [],
  sleep: [],
  nutrition: [],
  exercise: []
};

// Reset mocks before each test
beforeEach(() => {
  vi.resetAllMocks();
});

describe('Sheets Export Service', () => {
  it('should create a new spreadsheet if it does not exist', async () => {
    // Setup: Spreadsheet does not exist, creation succeeds
    (mockSpreadsheetAdapter.findSpreadsheet as any).mockResolvedValue(ok(null));
    (mockSpreadsheetAdapter.createSpreadsheet as any).mockResolvedValue(ok('new-sheet-id'));
    (mockSpreadsheetAdapter.updateRows as any).mockResolvedValue(ok(true));

    const result = await exportToSpreadsheet(
      mockHealthData,
      'folder-123',
      mockSpreadsheetAdapter,
      new Set()
    );

    expect(result.isOk()).toBe(true);
    const successResult = result.unwrap();
    expect(successResult.exportedSheets).toHaveLength(1);
    expect(successResult.exportedSheets[0]).toEqual({ year: 2025, spreadsheetId: 'new-sheet-id' });
    expect(mockSpreadsheetAdapter.createSpreadsheet).toHaveBeenCalledWith(
      expect.stringContaining('2025'),
      expect.any(Array),
      'folder-123'
    );
  });

  it('should update an existing spreadsheet if it exists', async () => {
    // Setup: Spreadsheet exists
    (mockSpreadsheetAdapter.findSpreadsheet as any).mockResolvedValue(ok('existing-sheet-id'));
    (mockSpreadsheetAdapter.getSheetData as any).mockResolvedValue(
      ok({ headers: ['Date', 'Steps'], rows: [['2025-01-01', '1000']] })
    );
    (mockSpreadsheetAdapter.updateRows as any).mockResolvedValue(ok(true));
    (mockSpreadsheetAdapter.updateHeaders as any).mockResolvedValue(ok(true)); // Add this line

    const result = await exportToSpreadsheet(
      mockHealthData,
      'folder-123',
      mockSpreadsheetAdapter,
      new Set()
    );

    expect(result.isOk()).toBe(true);
    const successResult = result.unwrap();
    expect(successResult.exportedSheets).toHaveLength(1);
    expect(successResult.exportedSheets[0]).toEqual({
      year: 2025,
      spreadsheetId: 'existing-sheet-id'
    });
    expect(mockSpreadsheetAdapter.updateRows).toHaveBeenCalled();
  });

  it('should fail if spreadsheet creation fails', async () => {
    (mockSpreadsheetAdapter.findSpreadsheet as any).mockResolvedValue(ok(null));
    (mockSpreadsheetAdapter.createSpreadsheet as any).mockResolvedValue(
      err(new Error('Create failed'))
    );

    const result = await exportToSpreadsheet(
      mockHealthData,
      'folder-123',
      mockSpreadsheetAdapter,
      new Set()
    );

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toContain('作成に失敗しました');
  });

  it('should return error if no health data to export', async () => {
    const emptyHealthData = {
      steps: [],
      weight: [],
      bodyFat: [],
      totalCaloriesBurned: [],
      basalMetabolicRate: [],
      sleep: [],
      nutrition: [],
      exercise: []
    };

    const result = await exportToSpreadsheet(
      emptyHealthData,
      'folder-123',
      mockSpreadsheetAdapter,
      new Set()
    );

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe('エクスポートするデータがありません');
  });
});
