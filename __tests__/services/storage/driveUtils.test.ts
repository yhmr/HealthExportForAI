import { describe, expect, it } from 'vitest';
import { escapeDriveQuery } from '../../../src/services/storage/driveUtils';

describe('Storage Utils', () => {
  describe('escapeDriveQuery', () => {
    it('should return the same string if no quotes are present', () => {
      expect(escapeDriveQuery('normal-folder-name')).toBe('normal-folder-name');
    });

    it('should escape single quotes', () => {
      expect(escapeDriveQuery("O'Reilly")).toBe("O\\'Reilly");
    });

    it('should escape multiple single quotes', () => {
      expect(escapeDriveQuery("'quoted'")).toBe("\\'quoted\\'");
    });

    it('should handle empty string', () => {
      expect(escapeDriveQuery('')).toBe('');
    });
  });
});
