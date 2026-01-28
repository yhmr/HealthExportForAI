import { GoogleDriveFile } from '../../../types/external/googleDrive';
import { FileInfo } from '../../../types/storage';

/**
 * GoogleDriveFile型をアプリ内部のFileInfo型に変換する
 */
export function mapGoogleDriveFileToFileInfo(file: GoogleDriveFile): FileInfo {
  // 名前がない場合はIDをフォールバックとして使用(レアケース対応)
  const name = file.name || file.id;

  return {
    id: file.id,
    name: name
    // mimeType等はFileInfoに現状含まれていないが、必要なら拡張可能
  };
}

/**
 * GoogleDriveFile型から単純な{id, name}オブジェクトへの変換
 * (listFoldersなどで使用されている型に合わせる)
 */
export function mapGoogleDriveFileToBasicInfo(file: GoogleDriveFile): { id: string; name: string } {
  return {
    id: file.id,
    name: file.name || file.id
  };
}

/**
 * フォルダの存在確認結果への変換
 * trashedフラグを考慮する
 */
export function mapGoogleDriveFileToExistence(file: GoogleDriveFile): boolean {
  return !file.trashed;
}
