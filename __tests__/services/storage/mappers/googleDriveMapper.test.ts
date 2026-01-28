import { describe, expect, it } from 'vitest';
import {
  mapGoogleDriveFileToBasicInfo,
  mapGoogleDriveFileToExistence,
  mapGoogleDriveFileToFileInfo
} from '../../../../src/services/storage/mappers/googleDriveMapper';
import { GoogleDriveFile } from '../../../../src/types/external/googleDrive';

describe('googleDriveMapper', () => {
  describe('mapGoogleDriveFileToFileInfo', () => {
    it('should map valid GoogleDriveFile to FileInfo', () => {
      const input: GoogleDriveFile = {
        id: '123',
        name: 'test-file',
        mimeType: 'application/json'
      };

      const result = mapGoogleDriveFileToFileInfo(input);

      expect(result).toEqual({
        id: '123',
        name: 'test-file'
      });
    });

    it('should use ID as name if name is missing', () => {
      const input: GoogleDriveFile = {
        id: '123'
      };

      const result = mapGoogleDriveFileToFileInfo(input);

      expect(result).toEqual({
        id: '123',
        name: '123'
      });
    });
  });

  describe('mapGoogleDriveFileToBasicInfo', () => {
    it('should map to basic info object', () => {
      const input: GoogleDriveFile = {
        id: 'folder-id',
        name: 'My Folder'
      };

      const result = mapGoogleDriveFileToBasicInfo(input);

      expect(result).toEqual({
        id: 'folder-id',
        name: 'My Folder'
      });
    });
  });

  describe('mapGoogleDriveFileToExistence', () => {
    it('should return true if trashed is false', () => {
      const input: GoogleDriveFile = { id: '1', trashed: false };
      expect(mapGoogleDriveFileToExistence(input)).toBe(true);
    });

    it('should return true if trashed is undefined (default)', () => {
      const input: GoogleDriveFile = { id: '1' };
      expect(mapGoogleDriveFileToExistence(input)).toBe(true);
    });

    it('should return false if trashed is true', () => {
      const input: GoogleDriveFile = { id: '1', trashed: true };
      expect(mapGoogleDriveFileToExistence(input)).toBe(false);
    });
  });
});
