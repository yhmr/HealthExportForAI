// PDFエクスポート
// Google SheetsをPDF形式でエクスポートしてDriveに保存

import { getAccessToken } from '../googleAuth';
import { findOrCreateFolder, DEFAULT_FOLDER_NAME } from '../googleDrive';
import { getExportFileName } from './utils';

/**
 * ArrayBufferをBase64に変換
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * スプレッドシート名から年を抽出
 */
function extractYearFromSpreadsheetId(spreadsheetId: string): number {
    // スプレッドシートIDからは年を取得できないため、現在の年を使用
    return new Date().getFullYear();
}

/**
 * スプレッドシートをPDF形式でエクスポートしてDriveに保存
 * @param year 対象年（ファイル名に使用）
 */
export async function exportSpreadsheetAsPDF(
    spreadsheetId: string,
    folderId?: string,
    folderName?: string,
    year?: number
): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            return { success: false, error: 'アクセストークンがありません' };
        }

        // SpreadsheetをPDF形式でエクスポート
        const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=pdf&portrait=false&gridlines=false&fitw=true`;

        const exportResponse = await fetch(exportUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!exportResponse.ok) {
            console.error('Export to PDF failed:', exportResponse.status);
            return { success: false, error: 'PDFエクスポートに失敗しました' };
        }

        // PDFデータを取得（React NativeではarrayBuffer()を直接使用）
        const pdfArrayBuffer = await exportResponse.arrayBuffer();
        const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);

        // フォルダIDを確認
        let targetFolderId = folderId;
        if (!targetFolderId) {
            targetFolderId = await findOrCreateFolder(folderName || DEFAULT_FOLDER_NAME, accessToken) ?? undefined;
        }

        // ファイル名を生成（統一ファイル名を使用、空白はアンダースコアに置換）
        const targetYear = year || new Date().getFullYear();
        const pdfFileName = getExportFileName(targetYear, 'pdf', true);

        // PDFをDriveにアップロード
        const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

        const metadata: any = {
            name: pdfFileName,
            mimeType: 'application/pdf',
        };

        if (targetFolderId) {
            metadata.parents = [targetFolderId];
        }

        const boundary = '-------314159265358979323846pdf';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/pdf\r\n' +
            'Content-Transfer-Encoding: base64\r\n\r\n' +
            pdfBase64 +
            closeDelimiter;

        const uploadResponse = await fetch(UPLOAD_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: multipartRequestBody,
        });

        if (uploadResponse.ok) {
            const data = await uploadResponse.json();
            console.log(`[PDF Export] Uploaded: ${pdfFileName} (ID: ${data.id})`);
            return { success: true, fileId: data.id };
        } else {
            const errorData = await uploadResponse.json();
            console.error('Upload PDF failed:', uploadResponse.status, errorData);
            return { success: false, error: 'PDFアップロードに失敗しました' };
        }
    } catch (error) {
        console.error('PDFエクスポートエラー:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'PDFエクスポートに失敗しました',
        };
    }
}
