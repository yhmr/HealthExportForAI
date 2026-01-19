export interface FileInfo {
    id: string;
    name: string;
}

export interface StorageAdapter {
    /** 初期化または認証（必要な場合） */
    initialize(): Promise<boolean>;

    /** フォルダを作成または既存のものを取得 */
    findOrCreateFolder(folderName: string): Promise<string | null>;

    /** フォルダが存在するか確認 */
    checkFolderExists(folderId: string): Promise<boolean>;

    /** フォルダ内のファイルを検索 */
    findFile(fileName: string, mimeType: string, folderId?: string): Promise<FileInfo | null>;

    /** ファイルをアップロード（新規作成） */
    uploadFile(content: string, fileName: string, mimeType: string, folderId?: string): Promise<string | null>;

    /** 既存のファイルを更新 */
    updateFile(fileId: string, content: string, mimeType: string): Promise<boolean>;

    /** デフォルトの保存フォルダ名 */
    readonly defaultFolderName: string;

    /** ファイルの内容をダウンロード */
    downloadFileContent(fileId: string): Promise<string | null>;
}

export interface SpreadsheetAdapter {
    /** スプレッドシートを検索 */
    findSpreadsheet(fileName: string, folderId?: string): Promise<string | null>;

    /** スプレッドシートを新規作成 */
    createSpreadsheet(fileName: string, headers: string[], folderId?: string): Promise<string | null>;

    /** シートデータを取得 */
    getSheetData(spreadsheetId: string): Promise<{ headers: string[]; rows: string[][] } | null>;

    /** ヘッダーを更新 */
    updateHeaders(spreadsheetId: string, headers: string[]): Promise<boolean>;

    /** 行データを更新/追加 */
    updateRows(spreadsheetId: string, startRow: number, rows: (string | number | null)[][]): Promise<boolean>;
}
