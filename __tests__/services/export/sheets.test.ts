
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToSpreadsheet } from '../../../src/services/export/sheets';
import type { StorageAdapter, SpreadsheetAdapter } from '../../../src/services/storage/interfaces';
import type { HealthData } from '../../../src/types/health';

// Mock Adapters
const mockStorageAdapter = {
    initialize: vi.fn(),
    defaultFolderName: 'Health Data',
    findOrCreateFolder: vi.fn(),
    checkFolderExists: vi.fn(),
} as unknown as StorageAdapter;

const mockSpreadsheetAdapter = {
    findSpreadsheet: vi.fn(),
    createSpreadsheet: vi.fn(),
    getSheetData: vi.fn(),
    updateHeaders: vi.fn(),
    updateRows: vi.fn(),
} as unknown as SpreadsheetAdapter;

// Mock Health Data
const mockHealthData: HealthData = {
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
    mockStorageAdapter.initialize = vi.fn().mockResolvedValue(true);
    mockStorageAdapter.checkFolderExists = vi.fn().mockResolvedValue(true);
    mockStorageAdapter.findOrCreateFolder = vi.fn().mockResolvedValue('folder-123');
});

describe('Sheets Export Service', () => {
    it('should create a new spreadsheet if it does not exist', async () => {
        // Setup: Spreadsheet does not exist
        (mockSpreadsheetAdapter.findSpreadsheet as any).mockResolvedValue(null);
        (mockSpreadsheetAdapter.createSpreadsheet as any).mockResolvedValue('new-sheet-id');
        (mockSpreadsheetAdapter.updateRows as any).mockResolvedValue(true);

        const result = await exportToSpreadsheet(
            mockHealthData,
            undefined,
            undefined,
            mockStorageAdapter,
            mockSpreadsheetAdapter
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
            undefined,
            undefined,
            mockStorageAdapter,
            mockSpreadsheetAdapter
        );

        expect(result.success).toBe(true);
        expect(result.exportedSheets[0].spreadsheetId).toBe('existing-sheet-id');

        // updateHeaders should NOT be called if headers match (checking simple case)
        // Actually our mock data headers are much longer (FIXED_HEADERS), existing is short.
        // So updateHeaders SHOULD be called to expand headers.
        expect(mockSpreadsheetAdapter.updateHeaders).toHaveBeenCalled();

        expect(mockSpreadsheetAdapter.updateRows).toHaveBeenCalledWith(
            'existing-sheet-id',
            2,
            expect.arrayContaining([expect.arrayContaining(['2025-01-01', 'Wednesday', 5000])])
        );
    });

    it('should fall back to default folder if specified folder not found', async () => {
        // Setup: Specified folder failure
        (mockStorageAdapter.checkFolderExists as any).mockResolvedValue(false);
        (mockStorageAdapter.findOrCreateFolder as any).mockResolvedValue('default-folder-id');
        (mockSpreadsheetAdapter.createSpreadsheet as any).mockResolvedValue('sheet-id');
        (mockSpreadsheetAdapter.updateRows as any).mockResolvedValue(true);

        const result = await exportToSpreadsheet(
            mockHealthData,
            'missing-folder-id',
            undefined,
            mockStorageAdapter,
            mockSpreadsheetAdapter
        );

        expect(result.success).toBe(true);
        expect(result.folderId).toBe('default-folder-id');
    });

    it('should handle spreadsheet creation failure', async () => {
        (mockSpreadsheetAdapter.findSpreadsheet as any).mockResolvedValue(null);
        (mockSpreadsheetAdapter.createSpreadsheet as any).mockResolvedValue(null); // Failure

        const result = await exportToSpreadsheet(
            mockHealthData,
            undefined,
            undefined,
            mockStorageAdapter,
            mockSpreadsheetAdapter
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('作成に失敗しました');
    });
});
