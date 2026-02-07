import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportToJSON } from '../../../src/services/export/json';
import { FileOperations } from '../../../src/services/storage/types';
import { err, ok } from '../../../src/types/result';

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
  weight: [{ date: '2025-01-01', value: 70, unit: 'kg' as const, time: '2025-01-01T08:00:00Z' }],
  bodyFat: [{ date: '2025-01-01', percentage: 20, time: '2025-01-01T08:00:00Z' }],
  totalCaloriesBurned: [{ date: '2025-01-01', value: 2000, unit: 'kcal' as const }],
  basalMetabolicRate: [
    { date: '2025-01-01', value: 1500, unit: 'kcal/day' as const, time: '2025-01-01T08:00:00Z' }
  ],
  sleep: [{ date: '2025-01-01', durationMinutes: 480, deepSleepPercentage: 20 }],
  nutrition: [
    {
      date: '2025-01-01',
      calories: 2000,
      protein: 100,
      totalFat: 50,
      totalCarbohydrate: 250,
      dietaryFiber: 30,
      saturatedFat: 10
    }
  ],
  exercise: [{ date: '2025-01-01', type: 'Running', durationMinutes: 30 }]
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

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe('new-file-id');

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

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe('existing-file-id');

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

    expect(result.isOk()).toBe(true);
    // It should start fresh if parsing fails
    const updateCall = (mockFileOps.updateFile as any).mock.calls[0];
    const jsonContent = JSON.parse(updateCall[1]);
    expect(jsonContent.records).toHaveLength(1); // Only new data
  });

  it('should return failure if update file fails', async () => {
    (mockFileOps.findFile as any).mockResolvedValue(ok({ id: 'existing-file-id' }));
    (mockFileOps.downloadFileContent as any).mockResolvedValue(
      ok(JSON.stringify({ year: 2025, records: [] }))
    );
    (mockFileOps.updateFile as any).mockResolvedValue(err(new Error('Update failed')));

    const result = await exportToJSON(mockHealthData, 'folder-123', mockFileOps);

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toContain('Update failed');
  });

  it('should return failure if upload file fails', async () => {
    (mockFileOps.findFile as any).mockResolvedValue(ok(null));
    (mockFileOps.uploadFile as any).mockResolvedValue(err(new Error('Upload failed')));

    const result = await exportToJSON(mockHealthData, 'folder-123', mockFileOps);

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toContain('Upload failed');
  });

  it('should return failure on unexpected exception', async () => {
    (mockFileOps.findFile as any).mockRejectedValue(new Error('Unexpected error'));

    const result = await exportToJSON(mockHealthData, 'folder-123', mockFileOps);

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe('Unexpected error');
  });
});
