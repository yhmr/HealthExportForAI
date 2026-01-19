// JSONエクスポート
// ヘルスデータをJSON形式でGoogle Driveにアップロード
// 年間データを蓄積（既存ファイルがあればマージ）

import type { HealthData } from '../../types/health';
import { getExportFileName } from './utils';
import type { ExportResult, ExportOptions } from './csv';
import type { StorageAdapter } from '../storage/interfaces';
import { DEFAULT_FOLDER_NAME } from '../storage/googleDrive'; // 定数のみインポート

// 日付ごとのデータ構造
interface DailyRecord {
    date: string;
    steps?: number;
    weight?: number;
    bodyFat?: number;
    totalCaloriesBurned?: number;
    basalMetabolicRate?: number;
    sleep?: {
        durationMinutes: number;
        deepSleepPercentage?: number;
    };
    nutrition?: {
        calories?: number;
        protein?: number;
        totalFat?: number;
        totalCarbohydrate?: number;
        dietaryFiber?: number;
        saturatedFat?: number;
    };
    exercise?: {
        type: string;
        durationMinutes: number;
    }[];
}

/**
 * HealthDataを日付ごとのレコードに変換
 */
function healthDataToDailyRecords(healthData: HealthData): Map<string, DailyRecord> {
    const recordMap = new Map<string, DailyRecord>();

    // 各データタイプを日付でマージ
    healthData.steps.forEach(d => {
        const record = recordMap.get(d.date) || { date: d.date };
        record.steps = d.count;
        recordMap.set(d.date, record);
    });

    healthData.weight.forEach(d => {
        const record = recordMap.get(d.date) || { date: d.date };
        record.weight = d.value;
        recordMap.set(d.date, record);
    });

    healthData.bodyFat.forEach(d => {
        const record = recordMap.get(d.date) || { date: d.date };
        record.bodyFat = d.percentage;
        recordMap.set(d.date, record);
    });

    healthData.totalCaloriesBurned.forEach(d => {
        const record = recordMap.get(d.date) || { date: d.date };
        record.totalCaloriesBurned = d.value;
        recordMap.set(d.date, record);
    });

    healthData.basalMetabolicRate.forEach(d => {
        const record = recordMap.get(d.date) || { date: d.date };
        record.basalMetabolicRate = d.value;
        recordMap.set(d.date, record);
    });

    healthData.sleep.forEach(d => {
        const record = recordMap.get(d.date) || { date: d.date };
        record.sleep = {
            durationMinutes: d.durationMinutes,
            deepSleepPercentage: d.deepSleepPercentage,
        };
        recordMap.set(d.date, record);
    });

    healthData.nutrition.forEach(d => {
        const record = recordMap.get(d.date) || { date: d.date };
        record.nutrition = {
            calories: d.calories,
            protein: d.protein,
            totalFat: d.totalFat,
            totalCarbohydrate: d.totalCarbohydrate,
            dietaryFiber: d.dietaryFiber,
            saturatedFat: d.saturatedFat,
        };
        recordMap.set(d.date, record);
    });

    healthData.exercise.forEach(d => {
        const record = recordMap.get(d.date) || { date: d.date };
        if (!record.exercise) {
            record.exercise = [];
        }
        record.exercise.push({
            type: d.type,
            durationMinutes: d.durationMinutes,
        });
        recordMap.set(d.date, record);
    });

    return recordMap;
}

/**
 * JSON形式へのエクスポート（年間データ蓄積対応）
 */
export async function exportToJSON(
    healthData: HealthData,
    options: ExportOptions | undefined,
    storageAdapter: StorageAdapter
): Promise<ExportResult> {
    try {
        const isInitialized = await storageAdapter.initialize();
        if (!isInitialized) {
            return { success: false, error: 'ストレージの初期化に失敗しました。サインイン状態を確認してください。' };
        }

        // フォルダIDを確認/作成
        let folderId = options?.folderId;
        if (!folderId) {
            const folderName = options?.folderName || storageAdapter.defaultFolderName;
            folderId = await storageAdapter.findOrCreateFolder(folderName) ?? undefined;
        }

        // データを日付ごとのレコードに変換
        const newRecordsMap = healthDataToDailyRecords(healthData);

        // データの年を取得
        const years = new Set<number>();
        for (const date of newRecordsMap.keys()) {
            years.add(new Date(date).getFullYear());
        }

        let lastFileId: string | undefined;

        // 年ごとにファイルを処理
        for (const year of years) {
            // 統一ファイル名を使用（空白はアンダースコアに置換）
            const fileName = getExportFileName(year, 'json', true);

            // 既存ファイルを検索
            const existingFile = await storageAdapter.findFile(fileName, 'application/json', folderId);
            let existingRecordsMap = new Map<string, DailyRecord>();

            if (existingFile) {
                // 既存ファイルの内容をダウンロード
                const existingContent = await storageAdapter.downloadFileContent(existingFile.id);
                if (existingContent) {
                    try {
                        const existingData = JSON.parse(existingContent);
                        if (existingData.records && Array.isArray(existingData.records)) {
                            existingData.records.forEach((record: DailyRecord) => {
                                existingRecordsMap.set(record.date, record);
                            });
                        }
                    } catch {
                        console.warn('[JSON Export] Failed to parse existing file, starting fresh');
                    }
                }
            }

            // 新規データをマージ（日付で上書き）
            for (const [date, record] of newRecordsMap) {
                if (new Date(date).getFullYear() === year) {
                    existingRecordsMap.set(date, record);
                }
            }

            // 日付順にソート
            const sortedRecords = [...existingRecordsMap.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([, record]) => record);

            // JSONデータを構造化
            const exportData = {
                exportedAt: new Date().toISOString(),
                year,
                dataType: 'HealthData',
                description: 'Health Connect data exported for AI analysis',
                summary: {
                    totalDays: sortedRecords.length,
                    dateRange: {
                        start: sortedRecords.length > 0 ? sortedRecords[0].date : 'N/A',
                        end: sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1].date : 'N/A',
                    },
                },
                records: sortedRecords,
            };

            const jsonContent = JSON.stringify(exportData, null, 2);

            // アップロード or 更新
            if (existingFile) {
                const success = await storageAdapter.updateFile(existingFile.id, jsonContent, 'application/json');
                if (success) {
                    console.log(`[JSON Export] Updated: ${fileName}`);
                    lastFileId = existingFile.id;
                } else {
                    return { success: false, error: 'JSONファイルの更新に失敗しました' };
                }
            } else {
                const fileId = await storageAdapter.uploadFile(jsonContent, fileName, 'application/json', folderId);
                if (fileId) {
                    console.log(`[JSON Export] Created: ${fileName}`);
                    lastFileId = fileId;
                } else {
                    return { success: false, error: 'JSONファイルのアップロードに失敗しました' };
                }
            }
        }

        return { success: true, fileId: lastFileId };
    } catch (error) {
        console.error('[JSON Export] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'JSONエクスポートに失敗しました',
        };
    }
}
