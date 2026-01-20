// エクスポート制御サービス
// エクスポート処理の唯一のエントリーポイント
// オンラインなら即時実行、オフラインならキューに追加

import type { HealthData } from '../../types/health';
import type { ExportFormat } from '../../config/driveConfig';
import { loadExportFormats, loadExportSheetAsPdf } from '../config/exportConfig';
import { loadDriveConfig } from '../config/driveConfig';
import type { StorageAdapter, SpreadsheetAdapter } from '../storage/interfaces';
import { createStorageAdapter, createSpreadsheetAdapter } from '../storage/adapterFactory';
import { exportToSpreadsheet } from './sheets';
import { exportSpreadsheetAsPDF } from './pdf';
import { exportToCSV } from './csv';
import { exportToJSON } from './json';
import { addDebugLog } from '../debugLogService';
import { addToQueue, getQueue } from '../offline-queue/queue-storage';
import { getNetworkStatus } from '../networkService';
import { useOfflineStore } from '../../stores/offlineStore';

// ===== 型定義 =====

/** エクスポートコンテキスト（共通設定） */
interface ExportContext {
    folderId?: string;
    folderName: string;
}

/** 各形式のエクスポート結果 */
interface FormatResult {
    format: ExportFormat | 'pdf';
    success: boolean;
    error?: string;
    fileId?: string;
}

/** エクスポート全体の結果 */
export interface ExportResults {
    success: boolean;
    results: FormatResult[];
    folderId?: string;
    error?: string;
}

// ===== エントリーポイント =====

/**
 * データをオフラインキューに追加するヘルパー
 */
async function addToQueueWithTags(healthData: HealthData, dateRange: Set<string>, error?: string) {
    const selectedTags = Object.entries(healthData)
        .filter(([_, data]) => Array.isArray(data) && data.length > 0)
        .map(([tag]) => tag);

    if (selectedTags.length > 0) {
        await addToQueue({
            healthData,
            selectedTags,
            syncDateRange: Array.from(dateRange),
            lastError: error
        });

        const queue = await getQueue();
        useOfflineStore.getState().setPendingCount(queue.length);
    }
}

/**
 * エクスポートリクエストを処理する（公開エントリーポイント）
 * オンラインなら即時実行し、失敗またはオフラインならキューに追加する
 * @param healthData エクスポート対象のヘルスデータ
 * @param dateRange 対象日付範囲
 * @returns 処理結果（成功: true, キュー追加: false）
 */
export async function handleExportRequest(healthData: HealthData, dateRange: Set<string>): Promise<boolean> {
    await addDebugLog('[ExportController] Handling export request...', 'info');

    try {
        const networkStatus = await getNetworkStatus();
        const isOnline = networkStatus === 'online';

        if (isOnline) {
            const storageAdapter = createStorageAdapter();
            const spreadsheetAdapter = createSpreadsheetAdapter();

            const result = await executeExport(
                healthData,
                storageAdapter,
                spreadsheetAdapter,
                dateRange
            );

            if (result.success) {
                await addDebugLog('[ExportController] Export executed successfully', 'success');
                return true;
            } else {
                await addDebugLog(`[ExportController] Immediate export failed: ${result.error}`, 'error');
                await addToQueueWithTags(healthData, dateRange, result.error);
                return false;
            }
        } else {
            await addDebugLog('[ExportController] Offline: queuing export request', 'info');
            await addToQueueWithTags(healthData, dateRange, 'Network is offline');
            return false;
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await addDebugLog(`[ExportController] Unexpected error: ${errorMsg}`, 'error');
        await addToQueueWithTags(healthData, dateRange, errorMsg);
        return false;
    }
}

// ===== 内部処理 =====

/**
 * エクスポートコンテキストを準備
 */
async function prepareContext(
    storageAdapter: StorageAdapter,
    folderId?: string,
    folderName?: string
): Promise<ExportContext | null> {
    const targetFolderName = folderName || storageAdapter.defaultFolderName;

    let targetFolderId = folderId;
    if (!targetFolderId) {
        const id = await storageAdapter.findOrCreateFolder(targetFolderName);
        targetFolderId = id ?? undefined;
    }

    return {
        folderId: targetFolderId,
        folderName: targetFolderName,
    };
}

/**
 * エクスポートを実行（内部用）
 * 選択された形式すべてにエクスポートを行い、結果をまとめて返す
 * @param healthData エクスポートするデータ
 * @param storageAdapter ストレージアダプター
 * @param spreadsheetAdapter スプレッドシートアダプター
 * @param originalDates フィルタリング前の元データの全日付（空行を維持するため）
 */
export async function executeExport(
    healthData: HealthData,
    storageAdapter: StorageAdapter,
    spreadsheetAdapter: SpreadsheetAdapter,
    originalDates?: Set<string>
): Promise<ExportResults> {
    const results: FormatResult[] = [];

    try {
        // 設定を読み込み
        const formats = await loadExportFormats();
        const exportAsPdf = await loadExportSheetAsPdf();
        const driveConfig = await loadDriveConfig();

        // エクスポートコンテキストを準備
        const context = await prepareContext(
            storageAdapter,
            driveConfig?.folderId,
            driveConfig?.folderName
        );

        if (!context) {
            return {
                success: false,
                results: [],
                error: 'アクセストークンがありません。サインインしてください。',
            };
        }

        // Google Sheetsへのエクスポート
        if (formats.includes('googleSheets')) {
            const result = await exportToSpreadsheet(
                healthData,
                context.folderId,
                context.folderName,
                storageAdapter,
                spreadsheetAdapter,
                originalDates
            );

            if (result.success) {
                result.exportedSheets.forEach(sheet => {
                    results.push({ format: 'googleSheets', success: true, fileId: sheet.spreadsheetId });
                });

                if (result.folderId) {
                    context.folderId = result.folderId;
                }

                // PDFオプションが有効な場合
                if (exportAsPdf && result.exportedSheets.length > 0) {
                    for (const sheet of result.exportedSheets) {
                        const pdfResult = await exportSpreadsheetAsPDF(
                            sheet.spreadsheetId,
                            storageAdapter,
                            context.folderId,
                            context.folderName,
                            sheet.year
                        );
                        results.push({
                            format: 'pdf',
                            success: pdfResult.success,
                            error: pdfResult.error,
                            fileId: pdfResult.fileId,
                        });
                    }
                }
            } else {
                results.push({ format: 'googleSheets', success: false, error: result.error });
            }
        }

        // CSVエクスポート
        if (formats.includes('csv')) {
            const result = await exportToCSV(
                healthData,
                {
                    folderId: context.folderId,
                    folderName: context.folderName,
                },
                storageAdapter
            );
            results.push({ format: 'csv', success: result.success, error: result.error, fileId: result.fileId });
        }

        // JSONエクスポート
        if (formats.includes('json')) {
            const result = await exportToJSON(
                healthData,
                {
                    folderId: context.folderId,
                    folderName: context.folderName,
                },
                storageAdapter
            );
            results.push({ format: 'json', success: result.success, error: result.error, fileId: result.fileId });
        }

        // 結果集約
        const successCount = results.filter(r => r.success).length;
        const hasSuccess = successCount > 0;

        if (hasSuccess) {
            await addDebugLog(`[ExportController] Successfully exported ${successCount} format(s)`, 'success');
        }

        return {
            success: hasSuccess,
            results,
            folderId: context.folderId,
        };
    } catch (error) {
        await addDebugLog(`[ExportController] Export error: ${error}`, 'error');
        return {
            success: false,
            results,
            error: error instanceof Error ? error.message : 'エクスポートに失敗しました',
        };
    }
}
