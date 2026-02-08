// ストレージ層共通型定義

import { NetworkError, StorageError } from '../../types/errors';
import { Result } from '../../types/result';

export interface FileInfo {
  id: string;
  name: string;
}

export interface Initializable {
  /** 初期化または認証（必要な場合） */
  initialize(): Promise<boolean>;
}

export interface FolderOperations {
  /** フォルダを作成または既存のものを取得 */
  findOrCreateFolder(folderName: string): Promise<Result<string, StorageError | NetworkError>>;

  /** フォルダが存在するか確認 */
  checkFolderExists(folderId: string): Promise<Result<boolean, StorageError | NetworkError>>;

  /** デフォルトの保存フォルダ名 */
  readonly defaultFolderName: string;
}

export interface FileOperations {
  /** フォルダ内のファイルを検索 */
  findFile(
    fileName: string,
    mimeType: string,
    folderId?: string
  ): Promise<Result<FileInfo | null, StorageError | NetworkError>>;

  /** ファイルをアップロード（新規作成） */
  uploadFile(
    content: string,
    fileName: string,
    mimeType: string,
    folderId?: string,
    isBase64?: boolean
  ): Promise<Result<string, StorageError | NetworkError>>;

  /** 既存のファイルを更新 */
  updateFile(
    fileId: string,
    content: string,
    mimeType: string,
    isBase64?: boolean
  ): Promise<Result<boolean, StorageError | NetworkError>>;

  /** ファイルの内容をダウンロード */
  downloadFileContent(fileId: string): Promise<Result<string, StorageError | NetworkError>>;
}

export interface SpreadsheetAdapter {
  /** スプレッドシートを検索 */
  findSpreadsheet(
    fileName: string,
    folderId?: string
  ): Promise<Result<string | null, StorageError | NetworkError>>;

  /** スプレッドシートを新規作成 */
  createSpreadsheet(
    fileName: string,
    headers: string[],
    folderId?: string
  ): Promise<Result<string, StorageError | NetworkError>>;

  /** シートデータを取得 */
  getSheetData(
    spreadsheetId: string
  ): Promise<Result<{ headers: string[]; rows: string[][] }, StorageError | NetworkError>>;

  /** ヘッダーを更新 */
  updateHeaders(
    spreadsheetId: string,
    headers: string[]
  ): Promise<Result<boolean, StorageError | NetworkError>>;

  /** 行データを更新/追加 */
  updateRows(
    spreadsheetId: string,
    startRow: number,
    rows: (string | number | null)[][]
  ): Promise<Result<boolean, StorageError | NetworkError>>;

  /** PDFエクスポート（Base64文字列として取得） */
  fetchPDF(spreadsheetId: string): Promise<Result<string, StorageError | NetworkError>>;
}
