// PDFエクスポート
// Google SheetsをPDF形式でエクスポートしてDriveに保存

import type { FileOperations, SpreadsheetAdapter } from '../storage/interfaces';
import { getExportFileName } from './utils';

/**
 * スプレッドシートをPDF形式でエクスポートしてDriveに保存
 * @param spreadsheetId スプレッドシートID
 * @param folderId フォルダID（確定済み）
 * @param storageAdapter ストレージアダプター
 * @param spreadsheetAdapter スプレッドシートアダプター (PDF取得用 - オプショナルだが推奨)
 * @param year 対象年（ファイル名に使用）
 */
export async function exportSpreadsheetAsPDF(
  spreadsheetId: string,
  folderId: string | undefined,
  fileOps: FileOperations,
  spreadsheetAdapter: SpreadsheetAdapter,
  year?: number
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    // 1. PDFをBase64形式で取得
    const pdfBase64 = await spreadsheetAdapter.fetchPDF(spreadsheetId);

    if (!pdfBase64) {
      return { success: false, error: 'PDFデータの取得に失敗しました' };
    }

    // 2. ファイル名を生成
    const targetYear = year || new Date().getFullYear();
    const pdfFileName = getExportFileName(targetYear, 'pdf', true);

    // 3. 既存のPDFファイルを検索
    const existingFile = await fileOps.findFile(pdfFileName, 'application/pdf', folderId);

    // 4. アップロードまたは更新
    if (existingFile) {
      // 既存ファイルを更新（上書き）
      // isBase64: true を指定してBase64コンテンツの更新を行う
      const success = await fileOps.updateFile(existingFile.id, pdfBase64, 'application/pdf', true);

      if (success) {
        return { success: true, fileId: existingFile.id };
      } else {
        return { success: false, error: 'PDF更新に失敗しました' };
      }
    } else {
      // 新規作成
      const fileId = await fileOps.uploadFile(
        pdfBase64,
        pdfFileName,
        'application/pdf',
        folderId,
        true // isBase64
      );

      if (fileId) {
        return { success: true, fileId };
      } else {
        return { success: false, error: 'PDF作成に失敗しました' };
      }
    }
  } catch (error) {
    console.error('PDF Export Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDFエクスポートエラー'
    };
  }
}
