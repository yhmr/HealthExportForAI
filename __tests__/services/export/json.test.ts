import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportToJSON } from '../../../src/services/export/json';
import type { StorageAdapter } from '../../../src/services/storage/interfaces';

// Mock debugLogService to prevent AsyncStorage usage
vi.mock('../../../src/services/debugLogService', () => ({
  addDebugLog: vi.fn()
}));

// Mock StorageAdapter
const mockStorageAdapter = {
  findFile: vi.fn(),
  uploadFile: vi.fn(),
  updateFile: vi.fn(),
  downloadFileContent: vi.fn()
} as unknown as StorageAdapter;

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

describe('JSON Export Service', () => {
  it('should create a new JSON file if it does not exist', async () => {
    // Setup: File does not exist, upload succeeds
    (mockStorageAdapter.findFile as any).mockResolvedValue(null);
    (mockStorageAdapter.uploadFile as any).mockResolvedValue('new-file-id');

    const result = await exportToJSON(mockHealthData, 'folder-123', mockStorageAdapter);

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
        { date: '2024-12-31', steps: 2000 }
      ]
    };
    (mockStorageAdapter.downloadFileContent as any).mockResolvedValue(JSON.stringify(existingData));
    (mockStorageAdapter.updateFile as any).mockResolvedValue(true);

    const result = await exportToJSON(mockHealthData, 'folder-123', mockStorageAdapter);

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

    // 2025-01-01 のデータが 1000 -> 5000 に更新されていることを確認
    const record = jsonContent.records.find((r: any) => r.date === '2025-01-01');
    expect(record).toBeDefined();
    expect(record.steps).toBe(5000);

    // 同じファイルに含まれていた2024年のデータが保持されていることを確認
    // (データが誤って消えていないかの回帰テスト)
    const record2024 = jsonContent.records.find((r: any) => r.date === '2024-12-31');
    expect(record2024).toBeDefined();
    expect(record2024.steps).toBe(2000);
  });

  it('should handle invalid existing JSON gracefuly', async () => {
    (mockStorageAdapter.findFile as any).mockResolvedValue({ id: 'existing-file-id' });
    (mockStorageAdapter.downloadFileContent as any).mockResolvedValue('invalid-json'); // Corrupt file
    (mockStorageAdapter.updateFile as any).mockResolvedValue(true);

    const result = await exportToJSON(mockHealthData, 'folder-123', mockStorageAdapter);

    expect(result.success).toBe(true);
    // It should start fresh if parsing fails
    const updateCall = (mockStorageAdapter.updateFile as any).mock.calls[0];
    const jsonContent = JSON.parse(updateCall[1]);
    expect(jsonContent.records).toHaveLength(1); // Only new data
  });
});
