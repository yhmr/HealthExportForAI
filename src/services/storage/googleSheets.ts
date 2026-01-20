// Google Sheets サービス
// スプレッドシートのCRUD操作に特化

const SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

/**
 * 名前でスプレッドシートを検索
 */
export async function findSpreadsheet(
    fileName: string,
    accessToken: string,
    folderId?: string
): Promise<string | null> {
    let query = `mimeType='application/vnd.google-apps.spreadsheet' and name='${fileName}' and trashed=false`;

    if (folderId) {
        query += ` and '${folderId}' in parents`;
    }

    const response = await fetch(
        `${DRIVE_API_URL}?q=${encodeURIComponent(query)}`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );

    if (!response.ok) {
        console.error('スプレッドシート検索エラー:', response.status);
        return null;
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
        return data.files[0].id;
    }
    return null;
}

/**
 * 新しいスプレッドシートを作成
 */
export async function createSpreadsheet(
    fileName: string,
    headers: string[],
    accessToken: string,
    folderId?: string
): Promise<string | null> {
    try {


        // スプレッドシート作成
        const createResponse = await fetch(SHEETS_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
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
                                            userEnteredValue: { stringValue: h },
                                        })),
                                    },
                                ],
                            },
                        ],
                    },
                ],
            }),
        });

        if (!createResponse.ok) {
            console.error('スプレッドシート作成エラー:', await createResponse.text());
            return null;
        }

        const spreadsheet = await createResponse.json();
        const spreadsheetId = spreadsheet.spreadsheetId;

        // フォルダが指定されている場合、移動
        if (folderId && spreadsheetId) {
            await moveToFolder(spreadsheetId, folderId, accessToken);
        }

        return spreadsheetId;
    } catch (error) {
        console.error('スプレッドシート作成エラー:', error);
        return null;
    }
}

/**
 * ファイルを指定フォルダに移動
 */
export async function moveToFolder(
    fileId: string,
    folderId: string,
    accessToken: string
): Promise<boolean> {
    try {
        // 現在の親フォルダを取得
        const fileResponse = await fetch(
            `${DRIVE_API_URL}/${fileId}?fields=parents`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (!fileResponse.ok) {
            return false;
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
                    'Content-Type': 'application/json',
                },
            }
        );

        return moveResponse.ok;
    } catch (error) {
        console.error('ファイル移動エラー:', error);
        return false;
    }
}

/**
 * スプレッドシートの既存データを取得
 */
export async function getSheetData(
    spreadsheetId: string,
    accessToken: string
): Promise<{ headers: string[]; rows: string[][] } | null> {
    try {
        const response = await fetch(
            `${SHEETS_API_URL}/${spreadsheetId}/values/Health Data!A:ZZ`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (!response.ok) {
            console.error('シートデータ取得エラー:', response.status);
            return null;
        }

        const data = await response.json();
        const values: string[][] = data.values || [];

        if (values.length === 0) {
            return { headers: [], rows: [] };
        }

        return {
            headers: values[0] || [],
            rows: values.slice(1),
        };
    } catch (error) {
        console.error('シートデータ取得エラー:', error);
        return null;
    }
}

/**
 * ヘッダー行を更新（エクササイズの動的カラム追加時）
 */
export async function updateHeaders(
    spreadsheetId: string,
    headers: string[],
    accessToken: string
): Promise<boolean> {
    try {
        const response = await fetch(
            `${SHEETS_API_URL}/${spreadsheetId}/values/Health Data!A1:${columnToLetter(headers.length)}1?valueInputOption=RAW`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    values: [headers],
                }),
            }
        );

        return response.ok;
    } catch (error) {
        console.error('ヘッダー更新エラー:', error);
        return false;
    }
}

/**
 * 行データを更新または追加
 */
export async function updateRows(
    spreadsheetId: string,
    startRow: number,
    rows: (string | number | null)[][],
    accessToken: string
): Promise<boolean> {
    try {
        if (rows.length === 0) return true;

        const maxColumns = Math.max(...rows.map((r) => r.length));
        const endRow = startRow + rows.length - 1;
        const range = `Health Data!A${startRow}:${columnToLetter(maxColumns)}${endRow}`;

        const response = await fetch(
            `${SHEETS_API_URL}/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    values: rows,
                }),
            }
        );

        return response.ok;
    } catch (error) {
        console.error('行更新エラー:', error);
        return false;
    }
}

/**
 * スプレッドシートをPDFとして取得（Base64形式）
 * @param spreadsheetId スプレッドシートID
 * @param accessToken アクセストークン
 */
export async function fetchPDF(
    spreadsheetId: string,
    accessToken: string
): Promise<string | null> {
    try {
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=pdf&portrait=false&size=A4&gridlines=false`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            console.error('Fetch PDF failed:', response.status);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();

        // ArrayBuffer to Base64
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    } catch (error) {
        console.error('PDF取得エラー:', error);
        return null;
    }
}

/**
 * 列番号を列文字に変換（1 -> A, 27 -> AA）
 */
export function columnToLetter(column: number): string {
    let temp = column;
    let letter = '';
    while (temp > 0) {
        const mod = (temp - 1) % 26;
        letter = String.fromCharCode(65 + mod) + letter;
        temp = Math.floor((temp - mod - 1) / 26);
    }
    return letter;
}
