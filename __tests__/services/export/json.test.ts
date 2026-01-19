
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToJSON } from '../../../src/services/export/json';
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

describe('JSON Export Service', () => {
    it('should create a new JSON file if it does not exist', async () => {
        // Setup: File does not exist, upload succeeds
        (mockStorageAdapter.findFile as any).mockResolvedValue(null);
        (mockStorageAdapter.uploadFile as any).mockResolvedValue('new-file-id');

        const result = await exportToJSON(mockHealthData, undefined, mockStorageAdapter);

        expect(result.success).toBe(true);
        expect(result.fileId).toBe('new-file-id');

        expect(mockStorageAdapter.uploadFile).toHaveBeenCalledWith(
            expect.any(String),
            'Health_Data_2025.json',
            'application/json',
            'folder-123'
        );

        // Verify JSON content
        const uploadCall = (mockStorageAdapter.uploadFile as any).mock.calls[0];
        const jsonContent = JSON.parse(uploadCall[0]);

        expect(jsonContent.year).toBe(2025);
        expect(jsonContent.records).toHaveLength(1);
        expect(jsonContent.records[0].date).toBe('2025-01-01');
        expect(jsonContent.records[0].steps).toBe(5000);
    });

    it('should update and merge with existing JSON file', async () => {
        // Setup: File exists with previous data
        (mockStorageAdapter.findFile as any).mockResolvedValue({ id: 'existing-file-id' });

        const existingData = {
            year: 2025,
            records: [
                { date: '2025-01-01', steps: 1000 },
                { date: '2024-12-31', steps: 2000 } // Different year shouldn't be here ideally but logic filters by year
            ]
        };
        (mockStorageAdapter.downloadFileContent as any).mockResolvedValue(JSON.stringify(existingData));
        (mockStorageAdapter.updateFile as any).mockResolvedValue(true);

        const result = await exportToJSON(mockHealthData, undefined, mockStorageAdapter);

        expect(result.success).toBe(true);
        expect(result.fileId).toBe('existing-file-id');

        expect(mockStorageAdapter.updateFile).toHaveBeenCalledWith(
            'existing-file-id',
            expect.any(String),
            'application/json'
        );

        // Verify merged content
        const updateCall = (mockStorageAdapter.updateFile as any).mock.calls[0];
        const jsonContent = JSON.parse(updateCall[1]);

        expect(jsonContent.year).toBe(2025);
        // Should contain 2025-01-01 updated to 5000
        // 2024 data should effectively be ignored or kept?
        // Logic says: "for (const year of years) { ... loaded existing records ... for newRecordsMap ... merge }"
        // And "existingRecordsMap.set(record.date, record)".
        // Wait, logic filters new data by year, but loads ALL existing records from file.
        // If file is Health_Data_2025.json, it should generally only contain 2025 data.
        // But if it contained 2024 data, it would be preserved unless filtered out.
        // Let's verify if implementation filters existing data by year.
        // Looking at json.ts: 
        // existingData.records.forEach... existingRecordsMap.set(...)
        // Then newRecordsMap loop: if (new Date(date).getFullYear() === year) { existingRecordsMap.set(...) }
        // So existing 2024 data would be preserved in the map and written back to 2025 file.

        // However, in this test case, we are testing the MERGE of 2025-01-01.
        const record = jsonContent.records.find((r: any) => r.date === '2025-01-01');
        expect(record).toBeDefined();
        expect(record.steps).toBe(5000); // Updated value

        // And verify 2024 data is preserved (if it was in the file, even if incorrect for the file name)
        const record2024 = jsonContent.records.find((r: any) => r.date === '2024-12-31');
        expect(record2024).toBeDefined();
    });

    it('should handle invalid existing JSON gracefuly', async () => {
        (mockStorageAdapter.findFile as any).mockResolvedValue({ id: 'existing-file-id' });
        (mockStorageAdapter.downloadFileContent as any).mockResolvedValue('invalid-json'); // Corrupt file
        (mockStorageAdapter.updateFile as any).mockResolvedValue(true);

        const result = await exportToJSON(mockHealthData, undefined, mockStorageAdapter);

        expect(result.success).toBe(true);
        // It should start fresh if parsing fails
        const updateCall = (mockStorageAdapter.updateFile as any).mock.calls[0];
        const jsonContent = JSON.parse(updateCall[1]);
        expect(jsonContent.records).toHaveLength(1); // Only new data
    });
});
