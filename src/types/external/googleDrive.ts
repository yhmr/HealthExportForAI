/**
 * Google Drive API の外部型定義
 * APIレスポンスの構造を定義する
 */

/**
 * Google Drive API から返されるファイルリソースの構造
 * https://developers.google.com/drive/api/reference/rest/v3/files
 */
export interface GoogleDriveFile {
  id: string;
  name?: string;
  mimeType?: string;
  trashed?: boolean;
  parents?: string[];
  // 必要に応じてフィールドを追加
  [key: string]: any; // 未知のフィールドに対する許容
}

/**
 * ファイルリスト取得時のレスポンス構造
 */
export interface GoogleDriveFileListResponse {
  files?: GoogleDriveFile[];
  nextPageToken?: string;
  incompleteSearch?: boolean;
  kind?: string;
}

/**
 * エラーレスポンス構造 (参考)
 */
export interface GoogleDriveErrorResponse {
  error: {
    code: number;
    message: string;
    errors: {
      message: string;
      domain: string;
      reason: string;
    }[];
  };
}
