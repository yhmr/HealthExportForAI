// Google Sheetsエクスポート
// ヘルスデータをGoogle Spreadsheetsにエクスポート

import type { HealthData } from '../../types/health';
// import type { HealthData } from '../../types/health';
import { formatHealthDataToRows, getExportFileName } from './utils';
import type { StorageAdapter, SpreadsheetAdapter } from '../storage/interfaces';

/**
 * ヘルスデータをスプレッドシートにエクスポート
 */
export async function exportToSpreadsheet(
    healthData: HealthData,
    folderId: string | undefined,
    folderName: string | undefined,
    baseFileName: string | undefined, // 基本ファイル名（年が追加される）
    storageAdapter: StorageAdapter,
    spreadsheetAdapter: SpreadsheetAdapter
): Promise<{ success: boolean; spreadsheetId?: string; folderId?: string; error?: string }> {
    try {
        const isInitialized = await storageAdapter.initialize();
        if (!isInitialized) {
            return { success: false, error: 'アクセストークンがありません。サインインしてください。' };
        }

        // フォルダIDの検証と準備
        let targetFolderId = folderId;

        if (targetFolderId) {
            // 指定されたフォルダが存在するか確認
            const folderExists = await storageAdapter.checkFolderExists(targetFolderId);
            if (!folderExists) {
                console.log('[Export] Specified folder not found, falling back to default');
                targetFolderId = undefined;
            }
        }

        if (!targetFolderId) {
            // フォルダを検索/作成（指定された名前またはデフォルト名を使用）
            const targetFolderName = folderName || storageAdapter.defaultFolderName;
            targetFolderId = await storageAdapter.findOrCreateFolder(targetFolderName) ?? undefined;
        }

        // 対象の年を取得（データの最新日付から）
        const allDates = [
            ...healthData.steps.map((d) => d.date),
            ...healthData.weight.map((d) => d.date),
            ...healthData.sleep.map((d) => d.date),
        ];

        if (allDates.length === 0) {
            return { success: false, error: 'エクスポートするデータがありません' };
        }

        // 年ごとにデータを分割
        const dataByYear = new Map<number, HealthData>();
        const getYear = (date: string) => new Date(date).getFullYear();

        const years = new Set<number>();
        allDates.forEach((date) => years.add(getYear(date)));

        for (const year of years) {
            const filterByYear = <T extends { date: string }>(items: T[]) =>
                items.filter((item) => getYear(item.date) === year);

            dataByYear.set(year, {
                steps: filterByYear(healthData.steps),
                weight: filterByYear(healthData.weight),
                bodyFat: filterByYear(healthData.bodyFat),
                totalCaloriesBurned: filterByYear(healthData.totalCaloriesBurned),
                basalMetabolicRate: filterByYear(healthData.basalMetabolicRate),
                sleep: filterByYear(healthData.sleep),
                exercise: filterByYear(healthData.exercise),
                nutrition: filterByYear(healthData.nutrition),
            });
        }

        let lastSpreadsheetId: string | undefined;

        // 各年のデータを処理
        for (const [year, yearData] of dataByYear) {
            const fileName = getExportFileName(year);
            // ファイル名を渡す
            let spreadsheetId = await spreadsheetAdapter.findSpreadsheet(fileName, targetFolderId);
            let existingHeaders: string[] = [];
            let existingRows: string[][] = [];

            if (spreadsheetId) {
                const sheetData = await spreadsheetAdapter.getSheetData(spreadsheetId);
                if (sheetData) {
                    existingHeaders = sheetData.headers;
                    existingRows = sheetData.rows;
                }
            }

            // データを行形式に変換
            const { headers: newHeaders, rows: newRowsMap } = formatHealthDataToRows(
                yearData,
                existingHeaders
            );

            // スプレッドシートが存在しない場合は新規作成
            if (!spreadsheetId) {
                // ファイル名を渡す
                spreadsheetId = await spreadsheetAdapter.createSpreadsheet(fileName, newHeaders, targetFolderId);
                if (!spreadsheetId) {
                    return { success: false, error: `${year}年のスプレッドシート作成に失敗しました` };
                }
            } else {
                // ヘッダーが変更された場合は更新
                if (newHeaders.length > existingHeaders.length) {
                    const updateResult = await spreadsheetAdapter.updateHeaders(spreadsheetId, newHeaders);
                    if (!updateResult) {
                        console.error('ヘッダー更新に失敗しました');
                    }
                }
            }

            // 既存の日付行をマップに変換
            const existingRowMap = new Map<string, (string | number | null)[]>();
            existingRows.forEach((row) => {
                if (row[0]) {
                    const paddedRow: (string | number | null)[] = [...row];
                    while (paddedRow.length < newHeaders.length) {
                        paddedRow.push(null);
                    }
                    existingRowMap.set(row[0], paddedRow);
                }
            });

            // 新規データで既存データを上書き/追加
            for (const [date, rowData] of newRowsMap) {
                existingRowMap.set(date, rowData);
            }

            // 全データを日付順にソートして配列に変換
            const allRows = [...existingRowMap.entries()]
                .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                .map(([, data]) => data.map((v) => (v === null ? '' : v)));

            // 全データを一括で書き込み
            if (allRows.length > 0) {
                const success = await spreadsheetAdapter.updateRows(spreadsheetId, 2, allRows);
                if (!success) {
                    console.error('データ書き込みに失敗しました');
                }
            }

            lastSpreadsheetId = spreadsheetId;
        }

        return { success: true, spreadsheetId: lastSpreadsheetId, folderId: targetFolderId };
    } catch (error) {
        console.error('スプレッドシートエクスポートエラー:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '不明なエラー',
        };
    }
}
