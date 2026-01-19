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

        // PDFのアップロードは StorageAdapter.uploadFile では Base64 を受け取れないため
        // 現状の uploadFile 実装を拡張するか、または pdf.ts は特殊ケースとして独自実装を残すか。
        // StorageAdapter.uploadFile は content: string を受け取るが、これはテキストコンテンツを想定している実装が多い。
        // ただし GoogleDriveAdapter.uploadFile は MIMEタイプを指定してアップロードできる。
        // バイナリ (Base64) をアップロードするには、multipart リクエストの構築が必要。
        // adapter.uploadFile がバイナリ文字列（Base64等）をどう扱うかによる。

        // ここでは、GoogleDriveAdapterの実装を確認すると、multipart/related で content をそのままbodyに入れている。
        // Base64のPDFを上げるには Content-Transfer-Encoding: base64 が必要だが、
        // 汎用 uploadFile はそれをサポートしていない可能性が高い。

        // そのため、PDFエクスポートロジック自体はここ（pdf.ts）に残します。
        // ただし、フォルダ検索などは adapter を使いました。
        // 完全な抽象化には BinaryStorageAdapter などが必要かもしれません。
        // 現状は「Google Driveへの保存」なので、既存のロジックを踏襲しつつ、
        // フォルダ周りのみAdapter利用としました。

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
