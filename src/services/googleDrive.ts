// Google Drive サービス（認証統合版）

import * as FileSystem from 'expo-file-system/legacy';
import type { DriveConfig } from '../config/driveConfig';
import type { ExportData } from '../types/health';
import { getAccessToken } from './googleAuth';

const GOOGLE_DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const GOOGLE_DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

// 自動作成するフォルダ名
export const DEFAULT_FOLDER_NAME = 'Health Export For AI Data';

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
 * 指定した名前のフォルダを検索または作成
 */
export async function findOrCreateFolder(
    folderName: string,
    accessToken: string
): Promise<string | null> {
    try {
        // 1. フォルダを検索
        const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
        const searchResponse = await fetch(
            `${GOOGLE_DRIVE_API_URL}?q=${encodeURIComponent(query)}`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (searchResponse.ok) {
            const data = await searchResponse.json();
            if (data.files && data.files.length > 0) {
                return data.files[0].id;
            }
        } else {
            console.error('Search folder failed:', searchResponse.status, await searchResponse.text());
        }

        // 2. フォルダがなければ作成
        return await createFolder(folderName, accessToken);
    } catch (error) {
        console.error('フォルダ作成エラー:', error);
        return null;
    }
}

/**
 * フォルダを作成
 */
export async function createFolder(
    folderName: string,
    accessToken: string,
    parentId?: string
): Promise<string | null> {
    try {
        const body: any = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
        };

        if (parentId) {
            body.parents = [parentId];
        }

        const createResponse = await fetch(GOOGLE_DRIVE_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (createResponse.ok) {
            const data = await createResponse.json();
            return data.id;
        } else {
            const errorData = await createResponse.json();
            console.error('Create folder failed:', createResponse.status, errorData);
            return null;
        }
    } catch (error) {
        console.error('フォルダ作成エラー:', error);
        return null;
    }
}

/**
 * フォルダ一覧を取得
 */
export async function listFolders(
    accessToken: string,
    parentId: string = 'root'
): Promise<{ id: string; name: string }[]> {
    try {
        // trashされていないフォルダを検索
        // parentIdが指定されている場合はその直下、なければroot直下
        const query = `mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
        const url = `${GOOGLE_DRIVE_API_URL}?q=${encodeURIComponent(query)}&orderBy=name&fields=files(id,name)`;

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.ok) {
            const data = await response.json();
            return data.files || [];
        } else {
            console.error('List folders failed:', response.status, await response.text());
            return [];
        }
    } catch (error) {
        console.error('フォルダ一覧取得エラー:', error);
        return [];
    }
}

/**
 * フォルダ情報を取得
 */
export async function getFolder(
    folderId: string,
    accessToken: string
): Promise<{ id: string; name: string } | null> {
    try {
        const url = `${GOOGLE_DRIVE_API_URL}/${folderId}?fields=id,name,mimeType,trashed`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.ok) {
            const data = await response.json();
            if (data.trashed) return null;
            return { id: data.id, name: data.name };
        } else {
            console.error('Get folder failed:', response.status);
            return null;
        }
    } catch (error) {
        console.error('フォルダ情報取得エラー:', error);
        return null;
    }
}

/**
 * ファイルをGoogle Driveにアップロード
 */
export async function uploadToDrive(
    fileUri: string,
    fileName: string,
    config: DriveConfig
): Promise<{ success: boolean; fileId?: string; error?: string; folderId?: string }> {
    try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            return { success: false, error: 'アクセストークンがありません。サインインしてください。' };
        }

        let folderId = config.folderId;

        // フォルダIDがない場合、自動作成を試みる
        if (!folderId) {
            const id = await findOrCreateFolder(DEFAULT_FOLDER_NAME, accessToken);
            if (id) {
                folderId = id;
            } else {
                return { success: false, error: '保存先フォルダを作成できませんでした' };
            }
        }

        // ファイル内容を読み込み
        const fileContent = await FileSystem.readAsStringAsync(fileUri);

        // メタデータ
        const metadata = {
            name: fileName,
            mimeType: 'application/json',
            parents: [folderId],
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
                Authorization: `Bearer ${accessToken}`,
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
            folderId, // 自動作成された場合のためにIDを返す
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
