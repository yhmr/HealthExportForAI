import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportToJSON } from '../../../src/services/export/json';
import type { FileOperations } from '../../../src/services/storage/interfaces';
import { ok } from '../../../src/types/result';

// Mock debugLogService to prevent AsyncStorage usage
vi.mock('../../../src/services/debugLogService', () => ({
  addDebugLog: vi.fn()
}));

// Mock StorageAdapter
const mockFileOps = {
  findFile: vi.fn(),
  uploadFile: vi.fn(),
  updateFile: vi.fn(),
  downloadFileContent: vi.fn()
} as unknown as FileOperations;

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
    (mockFileOps.findFile as any).mockResolvedValue(ok(null));
    (mockFileOps.uploadFile as any).mockResolvedValue(ok('new-file-id'));

    const result = await exportToJSON(mockHealthData, 'folder-123', mockFileOps);

    expect(result.success).toBe(true);
    expect(result.fileId).toBe('new-file-id');

    expect(mockFileOps.uploadFile).toHaveBeenCalledWith(
      expect.any(String),
      'Health_Data_2025.json',
      'application/json',
      'folder-123'
    );

    // Verify JSON content
    const uploadCall = (mockFileOps.uploadFile as any).mock.calls[0];
    const jsonContent = JSON.parse(uploadCall[0]);

    expect(jsonContent.year).toBe(2025);
    expect(jsonContent.records).toHaveLength(1);
    expect(jsonContent.records[0].date).toBe('2025-01-01');
    expect(jsonContent.records[0].steps).toBe(5000);
  });

  it('should update and merge with existing JSON file', async () => {
    // Setup: File exists with previous data
    (mockFileOps.findFile as any).mockResolvedValue(ok({ id: 'existing-file-id' }));

    const existingData = {
      year: 2025,
      records: [
        { date: '2025-01-01', steps: 1000 },
        { date: '2024-12-31', steps: 2000 }
      ]
    };
    (mockFileOps.downloadFileContent as any).mockResolvedValue(ok(JSON.stringify(existingData)));
    (mockFileOps.updateFile as any).mockResolvedValue(ok(true));

    const result = await exportToJSON(mockHealthData, 'folder-123', mockFileOps);

    expect(result.success).toBe(true);
    expect(result.fileId).toBe('existing-file-id');

    expect(mockFileOps.updateFile).toHaveBeenCalledWith(
      'existing-file-id',
      expect.any(String),
      'application/json'
    );

    // Verify merged content
    const updateCall = (mockFileOps.updateFile as any).mock.calls[0];
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
    (mockFileOps.findFile as any).mockResolvedValue(ok({ id: 'existing-file-id' }));
    (mockFileOps.downloadFileContent as any).mockResolvedValue(ok('invalid-json')); // Corrupt file
    (mockFileOps.updateFile as any).mockResolvedValue(ok(true));

    const result = await exportToJSON(mockHealthData, 'folder-123', mockFileOps);

    expect(result.success).toBe(true);
    // It should start fresh if parsing fails
    const updateCall = (mockFileOps.updateFile as any).mock.calls[0];
    const jsonContent = JSON.parse(updateCall[1]);
    expect(jsonContent.records).toHaveLength(1); // Only new data
  });
});
