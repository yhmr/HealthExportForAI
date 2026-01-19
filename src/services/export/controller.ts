// エクスポート制御サービス
// 各エクスポート形式の実行を一元管理

import type { HealthData } from '../../types/health';
import type { ExportFormat } from '../../config/driveConfig';
import { loadExportFormats, loadExportSheetAsPdf, loadDriveConfig } from '../storage';
import { findOrCreateFolder, DEFAULT_FOLDER_NAME } from '../googleDrive';
import { getAccessToken } from '../googleAuth';
import { exportToSpreadsheet } from './sheets';
import { exportSpreadsheetAsPDF } from './pdf';
import { exportToCSV } from './csv';
import { exportToJSON } from './json';

// エクスポートコンテキスト（共通設定）
interface ExportContext {
    folderId?: string;
    folderName: string;
    accessToken: string;
}

// 各形式のエクスポート結果
interface FormatResult {
    format: ExportFormat | 'pdf';
    success: boolean;
    error?: string;
    fileId?: string;
}

// エクスポート全体の結果
export interface ExportResults {
    success: boolean;
    results: FormatResult[];
    folderId?: string;
    error?: string;
}

/**
 * エクスポートコンテキストを準備
 */
async function prepareContext(folderId?: string, folderName?: string): Promise<ExportContext | null> {
    const accessToken = await getAccessToken();
    if (!accessToken) {
        return null;
    }

    const targetFolderName = folderName || DEFAULT_FOLDER_NAME;

    // フォルダIDを確認/作成
    let targetFolderId = folderId;
    if (!targetFolderId) {
        targetFolderId = await findOrCreateFolder(targetFolderName, accessToken) ?? undefined;
    }

    return {
        folderId: targetFolderId,
        folderName: targetFolderName,
        accessToken,
    };
}

/**
 * ヘルスデータから最も新しい年を取得
 */
function getLatestYear(healthData: HealthData): number {
    const allDates = [
        ...healthData.steps.map(d => d.date),
        ...healthData.weight.map(d => d.date),
        ...healthData.sleep.map(d => d.date),
    ];
    if (allDates.length === 0) {
        return new Date().getFullYear();
    }
    const latestDate = allDates.sort().pop()!;
    return new Date(latestDate).getFullYear();
}

/**
 * エクスポートを実行
 * 選択された形式すべてにエクスポートを行い、結果をまとめて返す
 */
export async function executeExport(healthData: HealthData): Promise<ExportResults> {
    const results: FormatResult[] = [];

    try {
        // 設定を読み込み
        const formats = await loadExportFormats();
        const exportAsPdf = await loadExportSheetAsPdf();
        const driveConfig = await loadDriveConfig();

        // エクスポートコンテキストを準備
        const context = await prepareContext(driveConfig?.folderId, driveConfig?.folderName);
        if (!context) {
            return {
                success: false,
                results: [],
                error: 'アクセストークンがありません。サインインしてください。',
            };
        }

        // PDFエクスポート用に最新年を取得
        const latestYear = getLatestYear(healthData);

        // Google Sheetsへのエクスポート
        if (formats.includes('googleSheets')) {
            const result = await exportToSpreadsheet(
                healthData,
                context.folderId,
                context.folderName
            );

            if (result.success) {
                results.push({ format: 'googleSheets', success: true, fileId: result.spreadsheetId });

                // フォルダIDを更新（新規作成された場合）
                if (result.folderId) {
                    context.folderId = result.folderId;
                }

                // PDFオプションが有効な場合
                if (exportAsPdf && result.spreadsheetId) {
                    const pdfResult = await exportSpreadsheetAsPDF(
                        result.spreadsheetId,
                        context.folderId,
                        context.folderName,
                        latestYear
                    );
                    results.push({
                        format: 'pdf',
                        success: pdfResult.success,
                        error: pdfResult.error,
                        fileId: pdfResult.fileId,
                    });
                }
            } else {
                results.push({ format: 'googleSheets', success: false, error: result.error });
            }
        }

        // CSVエクスポート（年間データ蓄積）
        if (formats.includes('csv')) {
            const result = await exportToCSV(healthData, {
                folderId: context.folderId,
                folderName: context.folderName,
            });
            results.push({ format: 'csv', success: result.success, error: result.error, fileId: result.fileId });
        }

        // JSONエクスポート（年間データ蓄積）
        if (formats.includes('json')) {
            const result = await exportToJSON(healthData, {
                folderId: context.folderId,
                folderName: context.folderName,
            });
            results.push({ format: 'json', success: result.success, error: result.error, fileId: result.fileId });
        }

        // 結果集約
        const successCount = results.filter(r => r.success).length;
        const hasSuccess = successCount > 0;

        if (hasSuccess) {
            console.log(`[ExportController] Successfully exported ${successCount} format(s)`);
        }

        return {
            success: hasSuccess,
            results,
            folderId: context.folderId,
        };
    } catch (error) {
        console.error('[ExportController] Export error:', error);
        return {
            success: false,
            results,
            error: error instanceof Error ? error.message : 'エクスポートに失敗しました',
        };
    }
}
