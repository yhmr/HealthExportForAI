// エクスポートサービス
// エクスポート機能のメインエントリーポイント

import type { ExportFormat } from '../../config/driveConfig';
import { useOfflineStore } from '../../stores/offlineStore';
import type { ExportConfig, PendingExport } from '../../types/exportTypes';
import type { DataTagKey, HealthData } from '../../types/health';
import { filterHealthDataByTags } from '../../utils/dataHelpers';
import { loadDriveConfig } from '../config/driveConfig';
import { loadExportFormats, loadExportSheetAsPdf } from '../config/exportConfig';
import { addDebugLog } from '../debugLogService';
import { getNetworkStatus } from '../networkService';
import {
  createFileOperations,
  createFolderOperations,
  createInitializer,
  createSpreadsheetAdapter
} from '../storage/adapterFactory';
import type {
  FileOperations,
  FolderOperations,
  Initializable,
  SpreadsheetAdapter
} from '../storage/interfaces';
import { exportToCSV } from './csv';
import { exportToJSON } from './json';
import { exportSpreadsheetAsPDF } from './pdf';
import { queueManager } from './QueueManager';
import { exportToSpreadsheet } from './sheets';

// ===== 型定義 =====

interface ExportContext {
  folderId?: string;
  folderName: string;
}

export interface FormatResult {
  format: ExportFormat | 'pdf';
  success: boolean;
  error?: string;
  fileId?: string;
}

export interface ExportResults {
  success: boolean;
  results: FormatResult[];
  folderId?: string;
  error?: string;
}

export interface ProcessQueueResult {
  successCount: number;
  failCount: number;
  skippedCount: number;
  errors: string[];
}

// デフォルトのタイムアウト（手動実行用：5分）
export const DEFAULT_EXECUTION_TIMEOUT_MS = 300000;
// バックグラウンド実行用のタイムアウト（OS制限回避用：25秒）
export const BACKGROUND_EXECUTION_TIMEOUT_MS = 25000;

// ===== 公開API =====

/**
 * デフォルトのエクスポート設定を生成
 */
export async function createDefaultExportConfig(): Promise<ExportConfig> {
  const formats = await loadExportFormats();
  const exportAsPdf = await loadExportSheetAsPdf();
  const driveConfig = await loadDriveConfig();

  return {
    formats,
    exportAsPdf,
    targetFolder: {
      id: driveConfig?.folderId,
      name: driveConfig?.folderName
    }
  };
}

/**
 * キュー内のエクスポートを処理
 * @param timeoutMs 各エントリのタイムアウト時間（ミリ秒）。デフォルトは5分。
 */
export async function processExportQueue(
  timeoutMs: number = DEFAULT_EXECUTION_TIMEOUT_MS
): Promise<ProcessQueueResult> {
  const result: ProcessQueueResult = {
    successCount: 0,
    failCount: 0,
    skippedCount: 0,
    errors: []
  };

  await addDebugLog(`[ExportService] Starting queue processing (timeout: ${timeoutMs}ms)`, 'info');

  const networkStatus = await getNetworkStatus();
  if (networkStatus !== 'online') {
    await addDebugLog('[ExportService] Offline, skipping', 'info');
    return result;
  }

  const queue = await queueManager.getQueue();
  await addDebugLog(`[ExportService] Queue size: ${queue.length}`, 'info');

  for (const entry of queue) {
    if (queueManager.hasExceededMaxRetries(entry)) {
      await addDebugLog(`[ExportService] Skipping ${entry.id} (max retries)`, 'info');
      result.skippedCount++;
      await queueManager.removeFromQueue(entry.id);
      result.errors.push(`Entry ${entry.id}: Max retries`);
      continue;
    }

    const success = await processSingleEntry(entry, timeoutMs);

    if (success) {
      result.successCount++;
      await queueManager.removeFromQueue(entry.id);
    } else {
      result.failCount++;
      const currentStatus = await getNetworkStatus();
      if (currentStatus !== 'online') {
        await addDebugLog('[ExportService] Network went offline, stopping', 'info');
        break;
      }
    }
  }

  const remainingQueue = await queueManager.getQueue();
  useOfflineStore.getState().setPendingCount(remainingQueue.length);

  await addDebugLog(
    `[ExportService] Process complete. Success: ${result.successCount}, Failed: ${result.failCount}`,
    'info'
  );

  return result;
}

// ===== 内部処理 =====

async function processSingleEntry(entry: PendingExport, timeoutMs: number): Promise<boolean> {
  await addDebugLog(`[ExportService] Processing ${entry.id}...`, 'info');

  try {
    // 必要な機能を個別に取得（ISP遵守）
    const initializer = createInitializer();
    const folderOps = createFolderOperations();
    const fileOps = createFileOperations();
    const spreadsheetAdapter = createSpreadsheetAdapter();

    const config = entry.exportConfig ?? (await createDefaultExportConfig());
    const selectedTags = new Set(entry.selectedTags as DataTagKey[]);
    const dataToExport = filterHealthDataByTags(entry.healthData, selectedTags);

    let syncDateRangeSet: Set<string>;
    if (entry.syncDateRange) {
      syncDateRangeSet = new Set(entry.syncDateRange);
    } else {
      syncDateRangeSet = new Set();
    }

    // タイムアウト付き実行
    const result = await Promise.race([
      executeExportInternal(
        dataToExport,
        initializer,
        folderOps,
        fileOps,
        spreadsheetAdapter,
        config,
        syncDateRangeSet
      ),
      new Promise<ExportResults>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout (${timeoutMs}ms)`)), timeoutMs)
      )
    ]);

    if (result.success) {
      await addDebugLog(`[ExportService] Entry ${entry.id} success`, 'success');
      return true;
    } else {
      const errorMsg = result.error || 'Unknown error';
      await addDebugLog(`[ExportService] Entry ${entry.id} failed: ${errorMsg}`, 'error');
      await queueManager.incrementRetry(entry.id, errorMsg);
      return false;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await addDebugLog(`[ExportService] Entry ${entry.id} error: ${errorMsg}`, 'error');
    await queueManager.incrementRetry(entry.id, errorMsg);
    return false;
  }
}

async function executeExportInternal(
  healthData: HealthData,
  initializer: Initializable,
  folderOps: FolderOperations,
  fileOps: FileOperations,
  spreadsheetAdapter: SpreadsheetAdapter,
  config: ExportConfig,
  originalDates: Set<string>
): Promise<ExportResults> {
  const results: FormatResult[] = [];

  try {
    const context = await prepareContext(
      initializer,
      folderOps,
      config.targetFolder?.id,
      config.targetFolder?.name
    );

    if (!context) {
      return {
        success: false,
        results: [],
        error: 'No access context (SignIn required)'
      };
    }

    if (config.formats.includes('googleSheets')) {
      const result = await exportToSpreadsheet(
        healthData,
        context.folderId,
        spreadsheetAdapter,
        originalDates
      );

      if (result.success) {
        result.exportedSheets.forEach((sheet) => {
          results.push({ format: 'googleSheets', success: true, fileId: sheet.spreadsheetId });
        });
        if (result.folderId) context.folderId = result.folderId;

        if (config.exportAsPdf && result.exportedSheets.length > 0) {
          for (const sheet of result.exportedSheets) {
            const pdfResult = await exportSpreadsheetAsPDF(
              sheet.spreadsheetId,
              context.folderId,
              fileOps,
              spreadsheetAdapter,
              sheet.year
            );
            results.push({
              format: 'pdf',
              success: pdfResult.success,
              error: pdfResult.error,
              fileId: pdfResult.fileId
            });
          }
        }
      } else {
        results.push({ format: 'googleSheets', success: false, error: result.error });
      }
    }

    if (config.formats.includes('csv')) {
      const result = await exportToCSV(healthData, context.folderId, fileOps);
      results.push({
        format: 'csv',
        success: result.success,
        error: result.error,
        fileId: result.fileId
      });
    }

    if (config.formats.includes('json')) {
      const result = await exportToJSON(healthData, context.folderId, fileOps);
      results.push({
        format: 'json',
        success: result.success,
        error: result.error,
        fileId: result.fileId
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const hasSuccess = successCount > 0;

    return {
      success: hasSuccess,
      results,
      folderId: context.folderId
    };
  } catch (error) {
    throw error;
  }
}

async function prepareContext(
  initializer: Initializable,
  folderOps: FolderOperations,
  folderId?: string,
  folderName?: string
): Promise<ExportContext | null> {
  const isInitialized = await initializer.initialize();
  if (!isInitialized) return null;

  const targetFolderName = folderName || folderOps.defaultFolderName;
  let targetFolderId = folderId;

  if (!targetFolderId) {
    const result = await folderOps.findOrCreateFolder(targetFolderName);
    if (result.isOk()) {
      targetFolderId = result.unwrap();
    } else {
      await addDebugLog(
        `[ExportService] Failed to find/create folder: ${result.unwrapErr().message}`,
        'error'
      );
      // フォルダ作成失敗時はnullを返す（コンテキスト作成失敗）
      return null;
    }
  }

  return { folderId: targetFolderId, folderName: targetFolderName };
}
