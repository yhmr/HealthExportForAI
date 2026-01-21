import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportToSpreadsheet } from '../../../src/services/export/sheets';
import type { SpreadsheetAdapter } from '../../../src/services/storage/interfaces';

// Mock Adapters
const mockSpreadsheetAdapter = {
  findSpreadsheet: vi.fn(),
  createSpreadsheet: vi.fn(),
  getSheetData: vi.fn(),
  updateHeaders: vi.fn(),
  updateRows: vi.fn()
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

// Mock original dates (sync date range)
const mockOriginalDates = new Set(['2025-01-01']);

// Reset mocks before each test
beforeEach(() => {
  vi.resetAllMocks();
});

describe('Sheets Export Service', () => {
  it('should create a new spreadsheet if it does not exist', async () => {
    // Setup: Spreadsheet does not exist
    (mockSpreadsheetAdapter.findSpreadsheet as any).mockResolvedValue(null);
    (mockSpreadsheetAdapter.createSpreadsheet as any).mockResolvedValue('new-sheet-id');
    (mockSpreadsheetAdapter.updateRows as any).mockResolvedValue(true);

    const result = await exportToSpreadsheet(
      mockHealthData,
      'folder-123',
      mockSpreadsheetAdapter,
      mockOriginalDates
    );

    expect(result.success).toBe(true);
    expect(result.exportedSheets[0].spreadsheetId).toBe('new-sheet-id');
    expect(mockSpreadsheetAdapter.createSpreadsheet).toHaveBeenCalledWith(
      'Health Data 2025',
      expect.any(Array), // Headers
      'folder-123'
    );
    expect(mockSpreadsheetAdapter.updateRows).toHaveBeenCalledWith(
      'new-sheet-id',
      2,
      expect.arrayContaining([expect.arrayContaining(['2025-01-01', 'Wednesday', 5000])])
    );
  });

  it('should update an existing spreadsheet', async () => {
    // Setup: Spreadsheet exists
    (mockSpreadsheetAdapter.findSpreadsheet as any).mockResolvedValue('existing-sheet-id');
    (mockSpreadsheetAdapter.getSheetData as any).mockResolvedValue({
      headers: ['Date', 'Day of Week', 'Steps'],
      rows: [['2025-01-01', 'Wednesday', '1000']]
    });
    (mockSpreadsheetAdapter.updateRows as any).mockResolvedValue(true);

    const result = await exportToSpreadsheet(
      mockHealthData,
      'folder-123',
      mockSpreadsheetAdapter,
      mockOriginalDates
    );

    expect(result.success).toBe(true);
    expect(result.exportedSheets[0].spreadsheetId).toBe('existing-sheet-id');

    // updateHeaders should be called to expand headers
    expect(mockSpreadsheetAdapter.updateHeaders).toHaveBeenCalled();

    expect(mockSpreadsheetAdapter.updateRows).toHaveBeenCalledWith(
      'existing-sheet-id',
      2,
      expect.arrayContaining([expect.arrayContaining(['2025-01-01', 'Wednesday', 5000])])
    );
  });

  // Note: Folder fallback test removed - responsibility moved to controller.ts

  it('should handle spreadsheet creation failure', async () => {
    (mockSpreadsheetAdapter.findSpreadsheet as any).mockResolvedValue(null);
    (mockSpreadsheetAdapter.createSpreadsheet as any).mockResolvedValue(null); // Failure

    const result = await exportToSpreadsheet(
      mockHealthData,
      'folder-123',
      mockSpreadsheetAdapter,
      mockOriginalDates
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('作成に失敗しました');
  });
});
