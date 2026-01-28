// Google Drive サービス
// フォルダ操作に特化したサービス
import { NetworkError, StorageError } from '../../types/errors';
import { Result, err, ok } from '../../types/result';
import { addDebugLog, logError } from '../debugLogService';
import { escapeDriveQuery } from './driveUtils';

const GOOGLE_DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

// 自動作成するフォルダ名
export const DEFAULT_FOLDER_NAME = 'Health Export For AI Data';

/**
 * フォルダを作成
 */
/**
 * フォルダを作成
 */
export async function createFolder(
  folderName: string,
  accessToken: string,
  parentId?: string
): Promise<Result<string, StorageError | NetworkError>> {
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
      return ok(data.id);
    } else {
      const msg = `[GoogleDrive] Create folder failed: ${createResponse.status}`;
      await addDebugLog(msg, 'error');
      return err(new StorageError(msg, 'CREATE_FOLDER_FAILED'));
    }
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      const netErr = new NetworkError('Create folder network error', 'NETWORK_ERROR', error);
      await logError(netErr);
      return err(netErr);
    } else {
      const storageErr = new StorageError(
        `Create folder error: ${error}`,
        'CREATE_FOLDER_EXCEPTION',
        error
      );
      await logError(storageErr);
      return err(storageErr);
    }
  }
}

/**
 * フォルダ一覧を取得
 */
/**
 * フォルダ一覧を取得
 */
export async function listFolders(
  accessToken: string,
  parentId: string = 'root'
): Promise<Result<{ id: string; name: string }[], StorageError | NetworkError>> {
  try {
    const query = `mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
    const url = `${GOOGLE_DRIVE_API_URL}?q=${encodeURIComponent(query)}&orderBy=name&fields=files(id,name)`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (response.ok) {
      const data = await response.json();
      return ok(data.files || []);
    } else {
      await addDebugLog(`[GoogleDrive] List folders failed: ${response.status}`, 'error');
      return err(
        new StorageError(`List folders failed: ${response.status}`, 'LIST_FOLDERS_FAILED')
      );
    }
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      const netErr = new NetworkError('List folders network error', 'NETWORK_ERROR', error);
      await logError(netErr);
      return err(netErr);
    } else {
      const storageErr = new StorageError(
        `List folders error: ${error}`,
        'LIST_FOLDERS_EXCEPTION',
        error
      );
      await logError(storageErr);
      return err(storageErr);
    }
  }
}

/**
 * フォルダ情報を取得
 */
/**
 * フォルダ情報を取得
 */
export async function getFolder(
  folderId: string,
  accessToken: string
): Promise<Result<{ id: string; name: string } | null, StorageError | NetworkError>> {
  try {
    const url = `${GOOGLE_DRIVE_API_URL}/${folderId}?fields=id,name,mimeType,trashed`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.trashed) return ok(null);
      return ok({ id: data.id, name: data.name });
    } else {
      await addDebugLog(`[GoogleDrive] Get folder failed: ${response.status}`, 'error');
      return err(new StorageError(`Get folder failed: ${response.status}`, 'GET_FOLDER_FAILED'));
    }
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      const netErr = new NetworkError('Get folder network error', 'NETWORK_ERROR', error);
      await logError(netErr);
      return err(netErr);
    } else {
      const storageErr = new StorageError(
        `Get folder error: ${error}`,
        'GET_FOLDER_EXCEPTION',
        error
      );
      await logError(storageErr);
      return err(storageErr);
    }
  }
}

/**
 * 指定したIDのフォルダが存在するか確認
 */
/**
 * 指定したIDのフォルダが存在するか確認
 */
export async function checkFolderExists(
  folderId: string,
  accessToken: string
): Promise<Result<boolean, StorageError | NetworkError>> {
  try {
    const url = `${GOOGLE_DRIVE_API_URL}/${folderId}?fields=id,trashed`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      // 404の場合はfalseを返す（エラーではない）
      if (response.status === 404) return ok(false);
      return err(
        new StorageError(`Check folder exists failed: ${response.status}`, 'CHECK_FOLDER_FAILED')
      );
    }

    const data = await response.json();
    // trashedの場合も存在しないとみなす
    return ok(!data.trashed);
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      // ネットワークエラーは判定不能なのでエラーを返す
      const netErr = new NetworkError('Check folder network error', 'NETWORK_ERROR', error);
      await logError(netErr);
      return err(netErr);
    } else {
      const storageErr = new StorageError(
        `CheckFolderExists Error: ${error}`,
        'CHECK_FOLDER_EXCEPTION',
        error
      );
      await logError(storageErr);
      return err(storageErr);
    }
  }
}

/**
 * 指定した名前のフォルダを検索または作成
 */
/**
 * 指定した名前のフォルダを検索または作成
 */
export async function findOrCreateFolder(
  folderName: string,
  accessToken: string
): Promise<Result<string, StorageError | NetworkError>> {
  try {
    // 1. フォルダを検索
    // 名前をエスケープ
    const safeFolderName = escapeDriveQuery(folderName);
    const query = `mimeType='application/vnd.google-apps.folder' and name='${safeFolderName}' and trashed=false`;
    const searchResponse = await fetch(`${GOOGLE_DRIVE_API_URL}?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (searchResponse.ok) {
      const data = await searchResponse.json();
      if (data.files && data.files.length > 0) {
        return ok(data.files[0].id);
      }
    }

    // 2. フォルダがなければ作成
    return await createFolder(folderName, accessToken);
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      const netErr = new NetworkError('Find/Create folder network error', 'NETWORK_ERROR', error);
      await logError(netErr);
      return err(netErr);
    } else {
      const storageErr = new StorageError(
        `Find/Create folder error: ${error}`,
        'FIND_CREATE_FOLDER_EXCEPTION',
        error
      );
      await logError(storageErr);
      return err(storageErr);
    }
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
/**
 * ファイルをGoogle Driveにアップロード
 * @param fileContent ファイルの内容（文字列）
 * @param fileName ファイル名
 * @param mimeType MIMEタイプ
 * @param accessToken アクセストークン
 * @param folderId 保存先フォルダID（省略時はルート）
 * @returns アップロードされたファイルのID
 */
export async function uploadFile(
  fileContent: string,
  fileName: string,
  mimeType: string,
  accessToken: string,
  folderId?: string,
  isBase64?: boolean
): Promise<Result<string, StorageError | NetworkError>> {
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
      return ok(data.id);
    } else {
      await addDebugLog(`[GoogleDrive] Upload file failed: ${response.status}`, 'error');
      return err(new StorageError(`Upload file failed: ${response.status}`, 'UPLOAD_FILE_FAILED'));
    }
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      const netErr = new NetworkError('Upload file network error', 'NETWORK_ERROR', error);
      await logError(netErr);
      return err(netErr);
    } else {
      const storageErr = new StorageError(
        `Upload file error: ${error}`,
        'UPLOAD_FILE_EXCEPTION',
        error
      );
      await logError(storageErr);
      return err(storageErr);
    }
  }
}

/**
 * ファイルを検索（名前とMIMEタイプで検索）
 */
/**
 * ファイルを検索（名前とMIMEタイプで検索）
 */
export async function findFile(
  fileName: string,
  mimeType: string,
  accessToken: string,
  folderId?: string
): Promise<Result<{ id: string; name: string } | null, StorageError | NetworkError>> {
  try {
    const safeFileName = escapeDriveQuery(fileName);
    let query = `mimeType='${mimeType}' and name='${safeFileName}' and trashed=false`;
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
      return err(new StorageError(`Find file failed: ${response.status}`, 'FIND_FILE_FAILED'));
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return ok({ id: data.files[0].id, name: data.files[0].name });
    }
    return ok(null);
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      const netErr = new NetworkError('Find file network error', 'NETWORK_ERROR', error);
      await logError(netErr);
      return err(netErr);
    } else {
      const storageErr = new StorageError(
        `Find file error: ${error}`,
        'FIND_FILE_EXCEPTION',
        error
      );
      await logError(storageErr);
      return err(storageErr);
    }
  }
}

/**
 * ファイル内容をダウンロード（テキストファイル用）
 */
/**
 * ファイル内容をダウンロード（テキストファイル用）
 */
export async function downloadFileContent(
  fileId: string,
  accessToken: string
): Promise<Result<string, StorageError | NetworkError>> {
  try {
    const response = await fetch(`${GOOGLE_DRIVE_API_URL}/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      await addDebugLog(`[GoogleDrive] Download file failed: ${response.status}`, 'error');
      return err(
        new StorageError(`Download file failed: ${response.status}`, 'DOWNLOAD_FILE_FAILED')
      );
    }

    const text = await response.text();
    return ok(text);
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      const netErr = new NetworkError('Download file network error', 'NETWORK_ERROR', error);
      await logError(netErr);
      return err(netErr);
    } else {
      const storageErr = new StorageError(
        `Download file error: ${error}`,
        'DOWNLOAD_FILE_EXCEPTION',
        error
      );
      await logError(storageErr);
      return err(storageErr);
    }
  }
}

/**
 * 既存ファイルを上書きアップロード
 */
/**
 * 既存ファイルを上書きアップロード
 */
export async function updateFile(
  fileId: string,
  fileContent: string,
  mimeType: string,
  accessToken: string,
  isBase64?: boolean
): Promise<Result<boolean, StorageError | NetworkError>> {
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
        return ok(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        await addDebugLog(
          `[GoogleDrive] Update file (Base64) failed: ${response.status} ${JSON.stringify(errorData)}`,
          'error'
        );
        return err(
          new StorageError(`Update file (Base64) failed: ${response.status}`, 'UPDATE_FILE_FAILED')
        );
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
        return ok(true);
      } else {
        await addDebugLog(`[GoogleDrive] Update file failed: ${response.status}`, 'error');
        return err(
          new StorageError(`Update file failed: ${response.status}`, 'UPDATE_FILE_FAILED')
        );
      }
    }
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      const netErr = new NetworkError('Update file network error', 'NETWORK_ERROR', error);
      await logError(netErr);
      return err(netErr);
    } else {
      const storageErr = new StorageError(
        `Update file error: ${error}`,
        'UPDATE_FILE_EXCEPTION',
        error
      );
      await logError(storageErr);
      return err(storageErr);
    }
  }
}
