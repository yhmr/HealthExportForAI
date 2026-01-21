// Google Drive サービス
// フォルダ操作に特化したサービス
import { addDebugLog } from '../debugLogService';
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
      mimeType: 'application/vnd.google-apps.folder'
    };

    if (parentId) {
      body.parents = [parentId];
    }

    const createResponse = await fetch(GOOGLE_DRIVE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (createResponse.ok) {
      const data = await createResponse.json();
      return data.id;
    } else {
      const errorData = await createResponse.json();
      await addDebugLog(`[GoogleDrive] Create folder failed: ${createResponse.status}`, 'error');
      return null;
    }
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      await addDebugLog('[GoogleDrive] Network request failed (CreateFolder)', 'info');
    } else {
      await addDebugLog(`[GoogleDrive] Create folder error: ${error}`, 'error');
    }
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
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (response.ok) {
      const data = await response.json();
      return data.files || [];
    } else {
      await addDebugLog(`[GoogleDrive] List folders failed: ${response.status}`, 'error');
      return [];
    }
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      await addDebugLog('[GoogleDrive] Network request failed (ListFolders)', 'info');
    } else {
      await addDebugLog(`[GoogleDrive] List folders error: ${error}`, 'error');
    }
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
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.trashed) return null;
      return { id: data.id, name: data.name };
    } else {
      await addDebugLog(`[GoogleDrive] Get folder failed: ${response.status}`, 'error');
      return null;
    }
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      await addDebugLog('[GoogleDrive] Network request failed (GetFolder)', 'info');
    } else {
      await addDebugLog(`[GoogleDrive] Get folder error: ${error}`, 'error');
    }
    return null;
  }
}

/**
 * 指定したIDのフォルダが存在するか確認
 */
export async function checkFolderExists(folderId: string, accessToken: string): Promise<boolean> {
  try {
    const url = `${GOOGLE_DRIVE_API_URL}/${folderId}?fields=id,trashed`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    // trashedの場合も存在しないとみなす
    return !data.trashed;
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      await addDebugLog('[GoogleDrive] Network request failed (CheckFolderExists)', 'info');
    } else {
      await addDebugLog(`[GoogleDrive] CheckFolderExists Error: ${error}`, 'error');
    }
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
    const searchResponse = await fetch(`${GOOGLE_DRIVE_API_URL}?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (searchResponse.ok) {
      const data = await searchResponse.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // 2. フォルダがなければ作成
    return await createFolder(folderName, accessToken);
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      await addDebugLog('[GoogleDrive] Network request failed (FindOrCreateFolder)', 'info');
    } else {
      await addDebugLog(`[GoogleDrive] Find/Create folder error: ${error}`, 'error');
    }
    return null;
  }
}

/**
 * ファイルをGoogle Driveにアップロード
 * @param fileContent ファイルの内容（文字列）
 * @param fileName ファイル名
 * @param mimeType MIMEタイプ
 * @param accessToken アクセストークン
 * @param folderId 保存先フォルダID（省略時はルート）
 * @returns アップロードされたファイルのID、失敗時はnull
 */
export async function uploadFile(
  fileContent: string,
  fileName: string,
  mimeType: string,
  accessToken: string,
  folderId?: string,
  isBase64?: boolean
): Promise<string | null> {
  try {
    const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    // メタデータ
    const metadata: any = {
      name: fileName,
      mimeType: mimeType
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    // マルチパートリクエストを構築
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    let contentTypeHeader = `Content-Type: ${mimeType}\r\n\r\n`;
    if (isBase64) {
      contentTypeHeader = `Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`;
    }

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      contentTypeHeader +
      fileContent +
      closeDelimiter;

    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });

    if (response.ok) {
      const data = await response.json();
      await addDebugLog(`[GoogleDrive] File uploaded: ${fileName} (ID: ${data.id})`, 'success');
      return data.id;
    } else {
      await addDebugLog(`[GoogleDrive] Upload file failed: ${response.status}`, 'error');
      return null;
    }
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      await addDebugLog('[GoogleDrive] Network request failed (UploadFile)', 'info');
    } else {
      await addDebugLog(`[GoogleDrive] Upload file error: ${error}`, 'error');
    }
    return null;
  }
}

/**
 * ファイルを検索（名前とMIMEタイプで検索）
 */
export async function findFile(
  fileName: string,
  mimeType: string,
  accessToken: string,
  folderId?: string
): Promise<{ id: string; name: string } | null> {
  try {
    let query = `mimeType='${mimeType}' and name='${fileName}' and trashed=false`;
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    const response = await fetch(
      `${GOOGLE_DRIVE_API_URL}?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (!response.ok) {
      await addDebugLog(`[GoogleDrive] Find file failed: ${response.status}`, 'error');
      return null;
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return { id: data.files[0].id, name: data.files[0].name };
    }
    return null;
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      await addDebugLog('[GoogleDrive] Network request failed (FindFile)', 'info');
    } else {
      await addDebugLog(`[GoogleDrive] Find file error: ${error}`, 'error');
    }
    return null;
  }
}

/**
 * ファイル内容をダウンロード（テキストファイル用）
 */
export async function downloadFileContent(
  fileId: string,
  accessToken: string
): Promise<string | null> {
  try {
    const response = await fetch(`${GOOGLE_DRIVE_API_URL}/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      await addDebugLog(`[GoogleDrive] Download file failed: ${response.status}`, 'error');
      return null;
    }

    return await response.text();
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      await addDebugLog('[GoogleDrive] Network request failed (DownloadFileContent)', 'info');
    } else {
      await addDebugLog(`[GoogleDrive] Download file error: ${error}`, 'error');
    }
    return null;
  }
}

/**
 * 既存ファイルを上書きアップロード
 */
export async function updateFile(
  fileId: string,
  fileContent: string,
  mimeType: string,
  accessToken: string,
  isBase64?: boolean
): Promise<boolean> {
  try {
    // Base64の場合はmultipart/relatedでアップロード
    if (isBase64) {
      const UPLOAD_URL = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;
      const metadata = {};

      const contentTypeHeader = `Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        contentTypeHeader +
        fileContent +
        closeDelimiter;

      const response = await fetch(UPLOAD_URL, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });

      if (response.ok) {
        await addDebugLog(`[GoogleDrive] File updated (Base64): ${fileId}`, 'success');
        return true;
      } else {
        const errorData = await response.json();
        await addDebugLog(
          `[GoogleDrive] Update file (Base64) failed: ${response.status} ${JSON.stringify(errorData)}`,
          'error'
        );
        return false;
      }
    } else {
      // 従来のテキスト更新（Simple Upload / Media Upload）
      // uploadType=media はコンテンツのみをPUT/PATCHする
      const MEDIA_UPLOAD_URL = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;

      const response = await fetch(MEDIA_UPLOAD_URL, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': mimeType
        },
        body: fileContent
      });

      if (response.ok) {
        await addDebugLog(`[GoogleDrive] File updated: ${fileId}`, 'success');
        return true;
      } else {
        const errorData = await response.json();
        await addDebugLog(`[GoogleDrive] Update file failed: ${response.status}`, 'error');
        return false;
      }
    }
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      await addDebugLog('[GoogleDrive] Network request failed (UpdateFile)', 'info');
    } else {
      await addDebugLog(`[GoogleDrive] Update file error: ${error}`, 'error');
    }
    return false;
  }
}
