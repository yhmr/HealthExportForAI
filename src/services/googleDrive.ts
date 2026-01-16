// Google Drive サービス

import * as FileSystem from 'expo-file-system';
import type { DriveConfig } from '../config/driveConfig';
import type { ExportData } from '../types/health';

const GOOGLE_DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

/**
 * JSONデータをファイルに保存
 */
export async function saveJsonToFile(
    data: ExportData,
    fileName: string
): Promise<string> {
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));
    return fileUri;
}

/**
 * ファイルをGoogle Driveにアップロード
 */
export async function uploadToDrive(
    fileUri: string,
    fileName: string,
    config: DriveConfig
): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
        // ファイル内容を読み込み
        const fileContent = await FileSystem.readAsStringAsync(fileUri);

        // メタデータ
        const metadata = {
            name: fileName,
            mimeType: 'application/json',
            parents: [config.folderId],
        };

        // マルチパートリクエストのboundary
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        // リクエストボディを構築
        const body =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            fileContent +
            closeDelimiter;

        // アップロードリクエスト
        const response = await fetch(`${GOOGLE_DRIVE_UPLOAD_URL}?uploadType=multipart`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body,
        });

        if (!response.ok) {
            const errorData = await response.json();
            return {
                success: false,
                error: errorData.error?.message || `HTTP ${response.status}`,
            };
        }

        const result = await response.json();
        return {
            success: true,
            fileId: result.id,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : '不明なエラー',
        };
    }
}

/**
 * エクスポートファイル名を生成
 */
export function generateExportFileName(): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `health-data-${timestamp}.json`;
}
