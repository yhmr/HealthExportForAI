// Google Drive API設定

export interface DriveConfig {
    folderId: string;
    folderName?: string;
}

// 設定ファイルのパス（アプリ内では手動で設定を読み込む）
export const DRIVE_CONFIG_FILE_NAME = 'drive-config.json';

// Web Client ID（環境変数から取得）
export const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_WEB_CLIENT_ID || '';

/**
 * デフォルトの空設定
 */
export const DEFAULT_DRIVE_CONFIG: DriveConfig = {
    folderId: '',
    folderName: '',
};

/**
 * 設定が有効かチェック
 */
export function isValidDriveConfig(config: DriveConfig): boolean {
    return Boolean(config.folderId);
}
