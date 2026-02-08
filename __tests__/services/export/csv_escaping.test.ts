import { describe, expect, it, vi } from 'vitest';
import { exportToCSV } from '../../../src/services/export/csv';
import { formatHealthDataToRows } from '../../../src/services/export/utils';
import { FileOperations } from '../../../src/services/storage/types';
import { ok } from '../../../src/types/result';

// Mock dependencies
vi.mock('../../../src/services/export/utils', () => ({
  formatHealthDataToRows: vi.fn(),
  getExportFileName: () => 'Health_Data_2025.csv'
}));

// Mock debugLogService to avoid window error
vi.mock('../../../src/services/debugLogService', () => ({
  addDebugLog: vi.fn()
}));

const mockFileOps: FileOperations = {
  findFile: vi.fn(),
  uploadFile: vi.fn(),
  updateFile: vi.fn(),
  downloadFileContent: vi.fn()
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
    (mockFileOps.findFile as any).mockResolvedValue(ok(null));
    (mockFileOps.uploadFile as any).mockResolvedValue(ok('new-id'));

    await exportToCSV({} as any, 'folder-id', mockFileOps);

    // Retrieve the generated CSV content
    expect(mockFileOps.uploadFile).toHaveBeenCalled();
    const callArgs = (mockFileOps.uploadFile as any).mock.calls[0];
    const csvContent: string = callArgs[0];

    // Verify escaping
    expect(csvContent).toContain('2025-01-01,Normal');
    expect(csvContent).toContain('2025-01-02,"Comma,Value"');
    expect(csvContent).toContain('2025-01-03,"Double""Quote"');
    expect(csvContent).toContain('2025-01-04,"New\nLine"');
    expect(csvContent).toContain('2025-01-05,"Mixed,""Mean\n"');
  });
});
