// エクスポートサービス
// エクスポート機能のメインエントリーポイント

import type { ExportFormat } from '../../config/driveConfig';
import type { DataTagKey } from '../../stores/healthStore';
import { filterHealthDataByTags } from '../../stores/healthStore';
import { useOfflineStore } from '../../stores/offlineStore';
import type { ExportConfig, PendingExport } from '../../types/exportTypes';
import type { HealthData } from '../../types/health';
import { loadDriveConfig } from '../config/driveConfig';
import { loadExportFormats, loadExportSheetAsPdf } from '../config/exportConfig';
import { addDebugLog } from '../debugLogService';
import { getNetworkStatus } from '../networkService';
import { createSpreadsheetAdapter, createStorageAdapter } from '../storage/adapterFactory';
import type { SpreadsheetAdapter, StorageAdapter } from '../storage/interfaces';
import { exportToCSV } from './csv';
import { exportToJSON } from './json';
import { exportSpreadsheetAsPDF } from './pdf';
import {
  addToQueue,
  getQueue,
  hasExceededMaxRetries,
  incrementRetry,
  removeFromQueue
} from './queue-storage';
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
 * エクスポートリクエストをキューに追加
 */
export async function addToExportQueue(
  healthData: HealthData,
  dateRange: Set<string>,
  config?: ExportConfig
): Promise<boolean> {
  const exportConfig = config ?? (await createDefaultExportConfig());
  const tags = Object.keys(healthData) as string[];

  await addDebugLog('[ExportService] Adding request to queue', 'info');

  try {
    const id = await addToQueue({
      healthData,
      selectedTags: tags,
      syncDateRange: Array.from(dateRange),
      exportConfig
    });

    if (id) {
      const count = (await getQueue()).length;
      useOfflineStore.getState().setPendingCount(count);
      return true;
    }
    return false;
  } catch (error) {
    await addDebugLog(`[ExportService] Queue add failed: ${error}`, 'error');
    return false;
  }
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

  const queue = await getQueue();
  await addDebugLog(`[ExportService] Queue size: ${queue.length}`, 'info');

  for (const entry of queue) {
    if (hasExceededMaxRetries(entry)) {
      await addDebugLog(`[ExportService] Skipping ${entry.id} (max retries)`, 'info');
      result.skippedCount++;
      await removeFromQueue(entry.id);
      result.errors.push(`Entry ${entry.id}: Max retries`);
      continue;
    }

    const success = await processSingleEntry(entry, timeoutMs);

    if (success) {
      result.successCount++;
      await removeFromQueue(entry.id);
    } else {
      result.failCount++;
      const currentStatus = await getNetworkStatus();
      if (currentStatus !== 'online') {
        await addDebugLog('[ExportService] Network went offline, stopping', 'info');
        break;
      }
    }
  }

  const remainingQueue = await getQueue();
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
    const storageAdapter = createStorageAdapter();
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
        storageAdapter,
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
      await incrementRetry(entry.id, errorMsg);
      return false;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await addDebugLog(`[ExportService] Entry ${entry.id} error: ${errorMsg}`, 'error');
    await incrementRetry(entry.id, errorMsg);
    return false;
  }
}

async function executeExportInternal(
  healthData: HealthData,
  storageAdapter: StorageAdapter,
  spreadsheetAdapter: SpreadsheetAdapter,
  config: ExportConfig,
  originalDates: Set<string>
): Promise<ExportResults> {
  const results: FormatResult[] = [];

  try {
    const context = await prepareContext(
      storageAdapter,
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
              storageAdapter,
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
      const result = await exportToCSV(healthData, context.folderId, storageAdapter);
      results.push({
        format: 'csv',
        success: result.success,
        error: result.error,
        fileId: result.fileId
      });
    }

    if (config.formats.includes('json')) {
      const result = await exportToJSON(healthData, context.folderId, storageAdapter);
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
  storageAdapter: StorageAdapter,
  folderId?: string,
  folderName?: string
): Promise<ExportContext | null> {
  const isInitialized = await storageAdapter.initialize();
  if (!isInitialized) return null;

  const targetFolderName = folderName || storageAdapter.defaultFolderName;
  let targetFolderId = folderId;

  if (!targetFolderId) {
    const id = await storageAdapter.findOrCreateFolder(targetFolderName);
    targetFolderId = id ?? undefined;
  }

  return { folderId: targetFolderId, folderName: targetFolderName };
}
