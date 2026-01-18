// Google Drive サービス
// フォルダ操作に特化したサービス

const GOOGLE_DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

// 自動作成するフォルダ名
export const DEFAULT_FOLDER_NAME = 'Health Export For AI Data';

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
 * 指定したIDのフォルダが存在するか確認
 */
export async function checkFolderExists(
    folderId: string,
    accessToken: string
): Promise<boolean> {
    try {
        const url = `${GOOGLE_DRIVE_API_URL}/${folderId}?fields=id,trashed`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        // trashedの場合も存在しないとみなす
        return !data.trashed;
    } catch (error) {
        console.error('[checkFolderExists] Error:', error);
        return false;
    }
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
        }

        // 2. フォルダがなければ作成
        return await createFolder(folderName, accessToken);
    } catch (error) {
        console.error('フォルダ検索/作成エラー:', error);
        return null;
    }
}
