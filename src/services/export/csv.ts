// CSVエクスポート
// ヘルスデータをCSV形式でGoogle Driveにアップロード
// 年間データを蓄積（既存ファイルがあればマージ）

import type { HealthData } from '../../types/health';
import { uploadFile, findOrCreateFolder, findFile, downloadFileContent, updateFile, DEFAULT_FOLDER_NAME } from '../googleDrive';
import { getAccessToken } from '../googleAuth';
import { formatHealthDataToRows, getExportFileName } from './utils';

// エクスポート結果の型
export interface ExportResult {
    success: boolean;
    fileId?: string;
    error?: string;
}

// エクスポートオプション
export interface ExportOptions {
    folderId?: string;
    folderName?: string;
    fileName?: string;
}

/**
 * CSVデータをパースして日付→行データのマップに変換
 */
function parseCSV(csvContent: string): Map<string, string[]> {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const dataMap = new Map<string, string[]>();

    // ヘッダー行をスキップして、データ行を処理
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]);
        if (row.length > 0 && row[0]) {
            // 日付（最初のカラム）をキーにする
            dataMap.set(row[0], row);
        }
    }

    return dataMap;
}

/**
 * CSV行をパース（ダブルクォート対応）
 */
function parseCSVRow(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // エスケープされたクォートをスキップ
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);

    return result;
}

/**
 * CSV形式へのエクスポート（年間データ蓄積対応）
 */
export async function exportToCSV(
    healthData: HealthData,
    options?: ExportOptions
): Promise<ExportResult> {
    try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            return { success: false, error: 'アクセストークンがありません。サインインしてください。' };
        }

        // フォルダIDを確認/作成
        let folderId = options?.folderId;
        if (!folderId) {
            const folderName = options?.folderName || DEFAULT_FOLDER_NAME;
            folderId = await findOrCreateFolder(folderName, accessToken) ?? undefined;
        }

        // データを行形式に変換
        const { headers, rows: newRowsMap } = formatHealthDataToRows(healthData, []);

        // データの年を取得
        const years = new Set<number>();
        for (const date of newRowsMap.keys()) {
            years.add(new Date(date).getFullYear());
        }

        let lastFileId: string | undefined;

        // 年ごとにファイルを処理
        for (const year of years) {
            // 統一ファイル名を使用（空白はアンダースコアに置換）
            const fileName = getExportFileName(year, 'csv', true);

            // 既存ファイルを検索
            const existingFile = await findFile(fileName, 'text/csv', accessToken, folderId);
            let existingRowMap = new Map<string, string[]>();

            if (existingFile) {
                // 既存ファイルの内容をダウンロード
                const existingContent = await downloadFileContent(existingFile.id, accessToken);
                if (existingContent) {
                    existingRowMap = parseCSV(existingContent);
                }
            }

            // 新規データをマージ（日付で上書き）
            for (const [date, rowData] of newRowsMap) {
                if (new Date(date).getFullYear() === year) {
                    // 文字列配列に変換
                    const stringRow = rowData.map(cell =>
                        cell === null ? '' : String(cell)
                    );
                    existingRowMap.set(date, stringRow);
                }
            }

            // 日付順にソート
            const sortedDates = [...existingRowMap.keys()].sort();

            // CSVコンテンツを生成
            const csvLines: string[] = [];
            csvLines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

            for (const date of sortedDates) {
                const row = existingRowMap.get(date)!;
                const csvRow = row.map(cell => {
                    if (typeof cell === 'string' && cell.includes(',')) {
                        return `"${cell.replace(/"/g, '""')}"`;
                    }
                    return cell;
                });
                csvLines.push(csvRow.join(','));
            }

            const csvContent = csvLines.join('\n');

            // アップロード or 更新
            if (existingFile) {
                const success = await updateFile(existingFile.id, csvContent, 'text/csv', accessToken);
                if (success) {
                    console.log(`[CSV Export] Updated: ${fileName}`);
                    lastFileId = existingFile.id;
                } else {
                    return { success: false, error: 'CSVファイルの更新に失敗しました' };
                }
            } else {
                const fileId = await uploadFile(csvContent, fileName, 'text/csv', accessToken, folderId);
                if (fileId) {
                    console.log(`[CSV Export] Created: ${fileName}`);
                    lastFileId = fileId;
                } else {
                    return { success: false, error: 'CSVファイルのアップロードに失敗しました' };
                }
            }
        }

        return { success: true, fileId: lastFileId };
    } catch (error) {
        console.error('[CSV Export] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'CSVエクスポートに失敗しました',
        };
    }
}
