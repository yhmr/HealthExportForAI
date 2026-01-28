import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportToCSV } from '../../../src/services/export/csv';
import type { FileOperations } from '../../../src/services/storage/interfaces';

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

// Mock DebugLogService
vi.mock('../../../src/services/debugLogService', () => ({
  addDebugLog: vi.fn()
}));

describe('CSV Export Service', () => {
  it('should create a new CSV file if it does not exist', async () => {
    // Setup: File does not exist, upload succeeds
    (mockFileOps.findFile as any).mockResolvedValue(null);
    (mockFileOps.uploadFile as any).mockResolvedValue('new-file-id');

    const result = await exportToCSV(mockHealthData, 'folder-123', mockFileOps);

    expect(result.success).toBe(true);
    expect(result.fileId).toBe('new-file-id');
    expect(mockFileOps.uploadFile).toHaveBeenCalledWith(
      expect.stringContaining('2025-01-01,Wednesday,5000'), // Check content partially
      'Health_Data_2025.csv',
      'text/csv',
      'folder-123'
    );
  });

  it('should update an existing CSV file if it exists', async () => {
    // Setup: File exists
    (mockFileOps.findFile as any).mockResolvedValue({ id: 'existing-file-id' });
    (mockFileOps.downloadFileContent as any).mockResolvedValue(
      '"Date","Day of Week","Steps"\n"2025-01-01","Wednesday","1000"' // Previous data
    );
    (mockFileOps.updateFile as any).mockResolvedValue(true);

    const result = await exportToCSV(mockHealthData, 'folder-123', mockFileOps);

    expect(result.success).toBe(true);
    expect(result.fileId).toBe('existing-file-id');

    // Check if updateFile was called with merged content
    expect(mockFileOps.updateFile).toHaveBeenCalledWith(
      'existing-file-id',
      expect.stringContaining('5000'), // Should perform update
      'text/csv'
    );
  });

  // Note: Storage initialization test removed - responsibility moved to controller.ts

  it('should handle upload failure', async () => {
    (mockFileOps.findFile as any).mockResolvedValue(null);
    (mockFileOps.uploadFile as any).mockResolvedValue(null); // Failure

    const result = await exportToCSV(mockHealthData, 'folder-123', mockFileOps);

    expect(result.success).toBe(false);
    expect(result.error).toContain('アップロードに失敗');
  });
});
