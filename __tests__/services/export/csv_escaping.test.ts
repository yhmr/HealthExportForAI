import { describe, expect, it, vi } from 'vitest';
import { exportToCSV } from '../../../src/services/export/csv';
import { formatHealthDataToRows } from '../../../src/services/export/utils';
import type { StorageAdapter } from '../../../src/services/storage/interfaces';

// Mock dependencies
vi.mock('../../../src/services/export/utils', () => ({
  formatHealthDataToRows: vi.fn(),
  getExportFileName: () => 'Health_Data_2025.csv'
}));

// Mock debugLogService to avoid window error
vi.mock('../../../src/services/debugLogService', () => ({
  addDebugLog: vi.fn()
}));

const mockStorageAdapter: StorageAdapter = {
  initialize: vi.fn(),
  findOrCreateFolder: vi.fn(),
  checkFolderExists: vi.fn(),
  findFile: vi.fn(),
  uploadFile: vi.fn(),
  updateFile: vi.fn(),
  downloadFileContent: vi.fn(),
  defaultFolderName: 'TestFolder'
};

describe('CSV Escaping', () => {
  it('should correctly escape special characters', async () => {
    // Setup mock data with various special characters
    (formatHealthDataToRows as any).mockReturnValue({
      headers: ['Date', 'Value'],
      rows: new Map([
        ['2025-01-01', ['2025-01-01', 'Normal']],
        ['2025-01-02', ['2025-01-02', 'Comma,Value']],
        ['2025-01-03', ['2025-01-03', 'Double"Quote']],
        ['2025-01-04', ['2025-01-04', 'New\nLine']],
        ['2025-01-05', ['2025-01-05', 'Mixed,"Mean\n']]
      ])
    });

    // Mock no existing file, triggering uploadFile
    (mockStorageAdapter.findFile as any).mockResolvedValue(null);
    (mockStorageAdapter.uploadFile as any).mockResolvedValue('new-id');

    await exportToCSV({} as any, 'folder-id', mockStorageAdapter);

    // Retrieve the generated CSV content
    expect(mockStorageAdapter.uploadFile).toHaveBeenCalled();
    const callArgs = (mockStorageAdapter.uploadFile as any).mock.calls[0];
    const csvContent: string = callArgs[0];

    // Verify escaping
    expect(csvContent).toContain('2025-01-01,Normal');
    expect(csvContent).toContain('2025-01-02,"Comma,Value"');
    expect(csvContent).toContain('2025-01-03,"Double""Quote"');
    expect(csvContent).toContain('2025-01-04,"New\nLine"');
    expect(csvContent).toContain('2025-01-05,"Mixed,""Mean\n"');
  });
});
