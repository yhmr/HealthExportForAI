import { type Result, err, ok } from '../../types/result'; // Result型をインポート
import type { FileOperations, SpreadsheetAdapter } from '../storage/types';
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
): Promise<Result<string | undefined, string>> {
  try {
    // 1. PDFをBase64形式で取得
    const pdfResult = await spreadsheetAdapter.fetchPDF(spreadsheetId);

    if (pdfResult.isErr()) {
      return err(`PDFデータの取得に失敗しました: ${pdfResult.unwrapErr().message}`);
    }
    const pdfBase64 = pdfResult.unwrap();

    // 2. ファイル名を生成
    const targetYear = year || new Date().getFullYear();
    const pdfFileName = getExportFileName(targetYear, 'pdf', true);

    // 3. 既存のPDFファイルを検索
    const findResult = await fileOps.findFile(pdfFileName, 'application/pdf', folderId);
    const existingFile = findResult.isOk() ? findResult.unwrap() : null;

    // 4. アップロードまたは更新
    if (existingFile) {
      // 既存ファイルを更新（上書き）
      // isBase64: true を指定してBase64コンテンツの更新を行う
      const updateResult = await fileOps.updateFile(
        existingFile.id,
        pdfBase64,
        'application/pdf',
        true
      );

      if (updateResult.isOk()) {
        return ok(existingFile.id);
      } else {
        return err(`PDF更新に失敗しました: ${updateResult.unwrapErr().message}`);
      }
    } else {
      // 新規作成
      const uploadResult = await fileOps.uploadFile(
        pdfBase64,
        pdfFileName,
        'application/pdf',
        folderId,
        true // isBase64
      );

      if (uploadResult.isOk()) {
        return ok(uploadResult.unwrap());
      } else {
        return err(`PDF作成に失敗しました: ${uploadResult.unwrapErr().message}`);
      }
    }
  } catch (error) {
    console.error('PDF Export Error:', error);
    return err(error instanceof Error ? error.message : 'PDFエクスポートエラー');
  }
}
