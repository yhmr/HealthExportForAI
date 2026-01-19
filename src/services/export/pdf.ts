// PDFエクスポート
// Google SheetsをPDF形式でエクスポートしてDriveに保存

import { getAccessToken } from '../googleAuth';
import { getExportFileName } from './utils';
import type { StorageAdapter } from '../storage/interfaces';

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
 * スプレッドシートをPDF形式でエクスポートしてDriveに保存
 * @param year 対象年（ファイル名に使用）
 */
export async function exportSpreadsheetAsPDF(
    spreadsheetId: string,
    storageAdapter: StorageAdapter,
    folderId?: string,
    folderName?: string,
    year?: number
): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
        const isInitialized = await storageAdapter.initialize();
        if (!isInitialized) {
            return { success: false, error: 'アクセストークンがありません' };
        }

        // 注意: Spreadsheets APIのPDFエクスポートエンドポイントは、StorageAdapterではなく
        // Google固有の機能であるため、ここではまだ直接フェッチする必要があります。
        // 将来的には SpreadsheetAdapter に `exportAsPDF` を追加するなども検討できますが、
        // フォルダIDを確認/作成
        // フォルダIDを確認/作成
        let targetFolderId = folderId;
        if (!targetFolderId) {
            const targetFolderName = folderName || storageAdapter.defaultFolderName;
            targetFolderId = await storageAdapter.findOrCreateFolder(targetFolderName) ?? undefined;
        }

        const accessToken = await getAccessToken(); // PDFエクスポートリクエスト用
        if (!accessToken) return { success: false, error: 'アクセストークンがありません' };

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
        // フォルダIDの計算は完了しているため、ここでは再計算しない

        // ファイル名を生成（統一ファイル名を使用、空白はアンダースコアに置換）
        const targetYear = year || new Date().getFullYear();
        const pdfFileName = getExportFileName(targetYear, 'pdf', true);

        // 既存のPDFファイルを検索
        const existingFile = await storageAdapter.findFile(pdfFileName, 'application/pdf', targetFolderId);

        const DRIVE_API_URL = 'https://www.googleapis.com/upload/drive/v3/files';
        const boundary = '-------314159265358979323846pdf';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        if (existingFile) {
            // 既存ファイルを上書き（PATCH）
            const updateUrl = `${DRIVE_API_URL}/${existingFile.id}?uploadType=multipart`;

            const metadata = {
                name: pdfFileName,
                mimeType: 'application/pdf',
            };

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/pdf\r\n' +
                'Content-Transfer-Encoding: base64\r\n\r\n' +
                pdfBase64 +
                closeDelimiter;

            const uploadResponse = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                },
                body: multipartRequestBody,
            });

            if (uploadResponse.ok) {
                console.log(`[PDF Export] Updated: ${pdfFileName}`);
                return { success: true, fileId: existingFile.id };
            } else {
                const errorData = await uploadResponse.json();
                console.error('Update PDF failed:', uploadResponse.status, errorData);
                return { success: false, error: 'PDF更新に失敗しました' };
            }
        } else {
            // 新規作成（POST）
            const uploadUrl = `${DRIVE_API_URL}?uploadType=multipart`;

            const metadata: Record<string, unknown> = {
                name: pdfFileName,
                mimeType: 'application/pdf',
            };

            if (targetFolderId) {
                metadata.parents = [targetFolderId];
            }

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/pdf\r\n' +
                'Content-Transfer-Encoding: base64\r\n\r\n' +
                pdfBase64 +
                closeDelimiter;

            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                },
                body: multipartRequestBody,
            });

            if (uploadResponse.ok) {
                const data = await uploadResponse.json();
                console.log(`[PDF Export] Created: ${pdfFileName} (ID: ${data.id})`);
                return { success: true, fileId: data.id };
            } else {
                const errorData = await uploadResponse.json();
                console.error('Upload PDF failed:', uploadResponse.status, errorData);
                return { success: false, error: 'PDFアップロードに失敗しました' };
            }
        }
    } catch (error) {
        console.error('PDFエクスポートエラー:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'PDFエクスポートに失敗しました',
        };
    }
}
