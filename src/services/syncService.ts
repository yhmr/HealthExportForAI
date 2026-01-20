// 同期サービス
// オフラインキュー内のエクスポートを処理

import type { PendingExport } from '../types/offline';
import type { DataTagKey } from '../stores/healthStore';
import { filterHealthDataByTags } from '../stores/healthStore';
import { executeExport } from './export/controller';
import { createStorageAdapter, createSpreadsheetAdapter } from './storage/adapterFactory';
import {
    getQueue,
    removeFromQueue,
    incrementRetry,
    hasExceededMaxRetries,
    MAX_RETRY_COUNT,
} from './offlineQueueService';
import { getNetworkStatus } from './networkService';

/**
 * キュー処理の結果
 */
export interface ProcessQueueResult {
    /** 成功したエントリ数 */
    successCount: number;
    /** 失敗したエントリ数 */
    failCount: number;
    /** スキップされたエントリ数（最大リトライ超過） */
    skippedCount: number;
    /** 処理中に発生したエラー */
    errors: string[];
}

/**
 * 単一のエクスポートエントリを処理
 * @param entry 処理するエントリ
 * @returns 成功した場合true
 */
export async function processSingleEntry(entry: PendingExport): Promise<boolean> {
    console.log(`[SyncService] Processing entry ${entry.id}...`);

    try {
        // ネットワーク状態を確認
        const networkStatus = await getNetworkStatus();
        if (networkStatus !== 'online') {
            console.log('[SyncService] Network is offline, skipping sync');
            return false;
        }

        // ファクトリ経由でアダプターを取得
        const storageAdapter = createStorageAdapter();
        const spreadsheetAdapter = createSpreadsheetAdapter();

        // 選択されたタグでデータをフィルタリング
        const selectedTags = new Set(entry.selectedTags as DataTagKey[]);
        const dataToExport = filterHealthDataByTags(entry.healthData, selectedTags);

        // 日付範囲をSetに変換
        const syncDateRange = entry.syncDateRange
            ? new Set(entry.syncDateRange)
            : undefined;

        // エクスポート実行
        const result = await executeExport(
            dataToExport,
            storageAdapter,
            spreadsheetAdapter,
            syncDateRange
        );

        if (result.success) {
            console.log(`[SyncService] Entry ${entry.id} processed successfully`);
            return true;
        } else {
            const errorMsg = result.error || 'Unknown error';
            console.error(`[SyncService] Entry ${entry.id} failed:`, errorMsg);
            await incrementRetry(entry.id, errorMsg);
            return false;
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[SyncService] Entry ${entry.id} threw error:`, errorMsg);
        await incrementRetry(entry.id, errorMsg);
        return false;
    }
}

/**
 * キュー内の全エクスポートを順次処理
 * @returns 処理結果
 */
export async function processQueue(): Promise<ProcessQueueResult> {
    const result: ProcessQueueResult = {
        successCount: 0,
        failCount: 0,
        skippedCount: 0,
        errors: [],
    };

    console.log('[SyncService] Starting queue processing...');

    // ネットワーク状態を確認
    const networkStatus = await getNetworkStatus();
    if (networkStatus !== 'online') {
        console.log('[SyncService] Network is offline, aborting queue processing');
        return result;
    }

    // キューを取得
    const queue = await getQueue();
    console.log(`[SyncService] Found ${queue.length} entries in queue`);

    for (const entry of queue) {
        // 最大リトライ回数チェック
        if (hasExceededMaxRetries(entry)) {
            console.log(
                `[SyncService] Entry ${entry.id} exceeded max retries (${MAX_RETRY_COUNT}), skipping`
            );
            result.skippedCount++;
            // キューから削除（失敗として扱う）
            await removeFromQueue(entry.id);
            result.errors.push(
                `Entry ${entry.id}: Max retries exceeded. Last error: ${entry.lastError}`
            );
            continue;
        }

        // 処理実行
        const success = await processSingleEntry(entry);

        if (success) {
            result.successCount++;
            // 成功したらキューから削除
            await removeFromQueue(entry.id);
        } else {
            result.failCount++;
            // 処理を続行（次のエントリへ）
            // ネットワークが切れた可能性があるので再チェック
            const currentStatus = await getNetworkStatus();
            if (currentStatus !== 'online') {
                console.log('[SyncService] Network went offline, stopping queue processing');
                break;
            }
        }
    }

    console.log(
        `[SyncService] Queue processing complete. Success: ${result.successCount}, Failed: ${result.failCount}, Skipped: ${result.skippedCount}`
    );

    return result;
}
