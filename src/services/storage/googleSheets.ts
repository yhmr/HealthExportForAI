// Google Sheets サービス
// スプレッドシートのCRUD操作に特化

import { Base64 } from 'js-base64';
import { NetworkError, StorageError } from '../../types/errors';
import { Result, err, ok } from '../../types/result';
import { addDebugLog, logError } from '../debugLogService';
import { escapeDriveQuery } from './driveUtils';

const SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

/**
 * 名前でスプレッドシートを検索
 */
/**
 * 名前でスプレッドシートを検索
 */
export async function findSpreadsheet(
  fileName: string,
  accessToken: string,
  folderId?: string
): Promise<Result<string | null, StorageError | NetworkError>> {
  try {
    const safeFileName = escapeDriveQuery(fileName);
    let query = `mimeType='application/vnd.google-apps.spreadsheet' and name='${safeFileName}' and trashed=false`;

    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    const response = await fetch(`${DRIVE_API_URL}?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      await addDebugLog(`[GoogleSheets] Find spreadsheet failed: ${response.status}`, 'error');
      return err(
        new StorageError(`Find spreadsheet failed: ${response.status}`, 'FIND_SPREADSHEET_FAILED')
      );
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return ok(data.files[0].id);
    }
    return ok(null);
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      const netErr = new NetworkError('Find spreadsheet network error', 'NETWORK_ERROR', error);
      await logError(netErr);
      return err(netErr);
    }
    const storageErr = new StorageError(
      `Find spreadsheet error: ${error}`,
      'FIND_SPREADSHEET_EXCEPTION',
      error
    );
    await logError(storageErr);
    return err(storageErr);
  }
}

/**
 * 新しいスプレッドシートを作成
 */
/**
 * 新しいスプレッドシートを作成
 */
export async function createSpreadsheet(
  fileName: string,
  headers: string[],
  accessToken: string,
  folderId?: string
): Promise<Result<string, StorageError | NetworkError>> {
  try {
    // スプレッドシート作成
    const createResponse = await fetch(SHEETS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title: fileName },
        sheets: [
          {
            properties: { title: 'Health Data' },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: headers.map((h) => ({
                      userEnteredValue: { stringValue: h }
                    }))
                  }
                ]
              }
            ]
          }
        ]
      })
    });

    if (!createResponse.ok) {
      const msg = `[GoogleSheets] Create spreadsheet failed: ${await createResponse.text()}`;
      await addDebugLog(msg, 'error');
      return err(new StorageError(msg, 'CREATE_SPREADSHEET_FAILED'));
    }

    const spreadsheet = await createResponse.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // フォルダが指定されている場合、移動
    if (folderId && spreadsheetId) {
      const moveResult = await moveToFolder(spreadsheetId, folderId, accessToken);
      if (moveResult.isErr()) {
        // 移動失敗はログに残すが、作成自体は成功としてIDを返すか、エラーとするか。
        // ここではWarningとして扱い、成功したIDを返すべきだが、Result型でWarning表現は難しい。
        // 移動失敗をエラーとして扱う。
        return err(
          new StorageError(
            `Created but failed to move: ${moveResult.unwrapErr().message}`,
            'MOVE_SPREADSHEET_FAILED'
          )
        );
      }
    }

    return ok(spreadsheetId);
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      const netErr = new NetworkError('Create spreadsheet network error', 'NETWORK_ERROR', error);
      await logError(netErr);
      return err(netErr);
    } else {
      const storageErr = new StorageError(
        `Create spreadsheet error: ${error}`,
        'CREATE_SPREADSHEET_EXCEPTION',
        error
      );
      await logError(storageErr);
      return err(storageErr);
    }
  }
}

/**
 * スプレッドシートの既存データを取得
 */
/**
 * スプレッドシートの既存データを取得
 */
export async function getSheetData(
  spreadsheetId: string,
  accessToken: string
): Promise<Result<{ headers: string[]; rows: string[][] }, StorageError | NetworkError>> {
  try {
    const response = await fetch(`${SHEETS_API_URL}/${spreadsheetId}/values/Health Data!A:ZZ`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      await addDebugLog(`[GoogleSheets] Get sheet data failed: ${response.status}`, 'error');
      return err(
        new StorageError(`Get sheet data failed: ${response.status}`, 'GET_SHEET_DATA_FAILED')
      );
    }

    const data = await response.json();
    const values: string[][] = data.values || [];

    if (values.length === 0) {
      return ok({ headers: [], rows: [] });
    }

    return ok({
      headers: values[0] || [],
      rows: values.slice(1)
    });
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      const netErr = new NetworkError('Get sheet data network error', 'NETWORK_ERROR', error);
      await logError(netErr);
      return err(netErr);
    } else {
      const storageErr = new StorageError(
        `Get sheet data error: ${error}`,
        'GET_SHEET_DATA_EXCEPTION',
        error
      );
      await logError(storageErr);
      return err(storageErr);
    }
  }
}

/**
 * ヘッダー行を更新（エクササイズの動的カラム追加時）
 */
/**
 * ヘッダー行を更新（エクササイズの動的カラム追加時）
 */
export async function updateHeaders(
  spreadsheetId: string,
  headers: string[],
  accessToken: string
): Promise<Result<boolean, StorageError | NetworkError>> {
  try {
    const response = await fetch(
      `${SHEETS_API_URL}/${spreadsheetId}/values/Health Data!A1:${columnToLetter(headers.length)}1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [headers]
        })
      }
    );

    if (response.ok) {
      return ok(true);
    } else {
      await addDebugLog(`[GoogleSheets] Update headers failed: ${response.status}`, 'error');
      return err(
        new StorageError(`Update headers failed: ${response.status}`, 'UPDATE_HEADERS_FAILED')
      );
    }
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      const netErr = new NetworkError('Update headers network error', 'NETWORK_ERROR', error);
      await logError(netErr);
      return err(netErr);
    } else {
      const storageErr = new StorageError(
        `Update headers error: ${error}`,
        'UPDATE_HEADERS_EXCEPTION',
        error
      );
      await logError(storageErr);
      return err(storageErr);
    }
  }
}

/**
 * 行データを更新または追加
 */
/**
 * 行データを更新または追加
 */
export async function updateRows(
  spreadsheetId: string,
  startRow: number,
  rows: (string | number | null)[][],
  accessToken: string
): Promise<Result<boolean, StorageError | NetworkError>> {
  try {
    if (rows.length === 0) return ok(true);

    const maxColumns = Math.max(...rows.map((r) => r.length));
    const endRow = startRow + rows.length - 1;
    const range = `Health Data!A${startRow}:${columnToLetter(maxColumns)}${endRow}`;

    const response = await fetch(
      `${SHEETS_API_URL}/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: rows
        })
      }
    );

    if (response.ok) {
      return ok(true);
    } else {
      await addDebugLog(`[GoogleSheets] Update rows failed: ${response.status}`, 'error');
      return err(new StorageError(`Update rows failed: ${response.status}`, 'UPDATE_ROWS_FAILED'));
    }
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      const netErr = new NetworkError('Update rows network error', 'NETWORK_ERROR', error);
      await logError(netErr);
      return err(netErr);
    } else {
      const storageErr = new StorageError(
        `Update rows error: ${error}`,
        'UPDATE_ROWS_EXCEPTION',
        error
      );
      await logError(storageErr);
      return err(storageErr);
    }
  }
}

/**
 * スプレッドシートをPDFとして取得（Base64形式）
 * @param spreadsheetId スプレッドシートID
 * @param accessToken アクセストークン
 */
/**
 * スプレッドシートをPDFとして取得（Base64形式）
 * @param spreadsheetId スプレッドシートID
 * @param accessToken アクセストークン
 */
export async function fetchPDF(
  spreadsheetId: string,
  accessToken: string
): Promise<Result<string, StorageError | NetworkError>> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=pdf&portrait=false&size=A4&gridlines=false`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      await addDebugLog(`[GoogleSheets] Fetch PDF failed: ${response.status}`, 'error');
      return err(new StorageError(`Fetch PDF failed: ${response.status}`, 'FETCH_PDF_FAILED'));
    }

    const arrayBuffer = await response.arrayBuffer();
    // Base64 変換 (js-base64 Util)
    return ok(Base64.fromUint8Array(new Uint8Array(arrayBuffer)));
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      const netErr = new NetworkError('Fetch PDF network error', 'NETWORK_ERROR', error);
      await logError(netErr);
      return err(netErr);
    } else {
      const storageErr = new StorageError(
        `Fetch PDF error: ${error}`,
        'FETCH_PDF_EXCEPTION',
        error
      );
      await logError(storageErr);
      return err(storageErr);
    }
  }
}

/**
 * 列番号を列文字に変換（1 -> A, 27 -> AA）
 */
function columnToLetter(column: number): string {
  let temp = column;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod - 1) / 26);
  }
  return letter;
}

/**
 * ファイルを指定フォルダに移動 (内部利用のみ)
 */
/**
 * ファイルを指定フォルダに移動 (内部利用のみ)
 */
async function moveToFolder(
  fileId: string,
  folderId: string,
  accessToken: string
): Promise<Result<boolean, StorageError | NetworkError>> {
  try {
    // 現在の親フォルダを取得
    const fileResponse = await fetch(`${DRIVE_API_URL}/${fileId}?fields=parents`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!fileResponse.ok) {
      return err(
        new StorageError(
          `Get properties for move failed: ${fileResponse.status}`,
          'MOVE_GET_PROP_FAILED'
        )
      );
    }

    const fileData = await fileResponse.json();
    const previousParents = fileData.parents?.join(',') || '';

    // 新しいフォルダに移動
    const moveResponse = await fetch(
      `${DRIVE_API_URL}/${fileId}?addParents=${folderId}&removeParents=${previousParents}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (moveResponse.ok) {
      return ok(true);
    } else {
      return err(
        new StorageError(
          `Move spreadsheet failed: ${moveResponse.status}`,
          'MOVE_SPREADSHEET_FAILED'
        )
      );
    }
  } catch (error: any) {
    if (error?.message === 'Network request failed') {
      // 内部利用だがログ
      return err(new NetworkError('Move spreadsheet network error', 'NETWORK_ERROR', error));
    } else {
      return err(new StorageError(`Move file error: ${error}`, 'MOVE_FILE_EXCEPTION', error));
    }
  }
}
