// Google Drive API設定

export interface DriveConfig {
    accessToken: string;
    refreshToken?: string;
    folderId: string;
    clientId?: string;
    clientSecret?: string;
}

// 設定ファイルのパス（アプリ内では手動で設定を読み込む）
export const DRIVE_CONFIG_FILE_NAME = 'drive-config.json';

/**
 * デフォルトの空設定
 */
export const DEFAULT_DRIVE_CONFIG: DriveConfig = {
    accessToken: '',
    folderId: '',
};

/**
 * 設定が有効かチェック
 */
export function isValidDriveConfig(config: DriveConfig): boolean {
    return Boolean(config.accessToken && config.folderId);
}
