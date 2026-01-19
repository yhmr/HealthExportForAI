
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToCSV } from '../../../src/services/export/csv';
import type { StorageAdapter } from '../../../src/services/storage/interfaces';
import type { HealthData } from '../../../src/types/health';

// Mock StorageAdapter
const mockStorageAdapter = {
    initialize: vi.fn(),
    defaultFolderName: 'Health Data',
    findOrCreateFolder: vi.fn(),
    findFile: vi.fn(),
    uploadFile: vi.fn(),
    updateFile: vi.fn(),
    downloadFileContent: vi.fn(),
    checkFolderExists: vi.fn(),
} as unknown as StorageAdapter;

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
    mockStorageAdapter.findOrCreateFolder = vi.fn().mockResolvedValue('folder-123');
});

describe('CSV Export Service', () => {
    it('should create a new CSV file if it does not exist', async () => {
        // Setup: File does not exist, upload succeeds
        (mockStorageAdapter.findFile as any).mockResolvedValue(null);
        (mockStorageAdapter.uploadFile as any).mockResolvedValue('new-file-id');

        const result = await exportToCSV(mockHealthData, undefined, mockStorageAdapter);

        expect(result.success).toBe(true);
        expect(result.fileId).toBe('new-file-id');
        expect(mockStorageAdapter.uploadFile).toHaveBeenCalledWith(
            expect.stringContaining('2025-01-01,Wednesday,5000'), // Check content partially
            'Health_Data_2025.csv',
            'text/csv',
            'folder-123'
        );
    });

    it('should update an existing CSV file if it exists', async () => {
        // Setup: File exists
        (mockStorageAdapter.findFile as any).mockResolvedValue({ id: 'existing-file-id' });
        (mockStorageAdapter.downloadFileContent as any).mockResolvedValue(
            '"Date","Day of Week","Steps"\n"2025-01-01","Wednesday","1000"' // Previous data
        );
        (mockStorageAdapter.updateFile as any).mockResolvedValue(true);

        const result = await exportToCSV(mockHealthData, undefined, mockStorageAdapter);

        expect(result.success).toBe(true);
        expect(result.fileId).toBe('existing-file-id');

        // Check if updateFile was called with merged content (new data should overwrite/merge)
        // Note: Our mock data has 5000 steps for 2025-01-01, existing has 1000. Logic should prefer new data?
        // Actually the logic is: "update existingRowMap with newRowsMap".
        // So 2025-01-01 should become 5000.
        expect(mockStorageAdapter.updateFile).toHaveBeenCalledWith(
            'existing-file-id',
            expect.stringContaining('5000'), // Should perform update
            'text/csv'
        );
    });

    it('should handle storage initialization failure', async () => {
        (mockStorageAdapter.initialize as any).mockResolvedValue(false);

        const result = await exportToCSV(mockHealthData, undefined, mockStorageAdapter);

        expect(result.success).toBe(false);
        expect(result.error).toContain('ストレージの初期化に失敗');
    });

    it('should handle upload failure', async () => {
        (mockStorageAdapter.findFile as any).mockResolvedValue(null);
        (mockStorageAdapter.uploadFile as any).mockResolvedValue(null); // Failure

        const result = await exportToCSV(mockHealthData, undefined, mockStorageAdapter);

        expect(result.success).toBe(false);
        expect(result.error).toContain('アップロードに失敗');
    });
});
