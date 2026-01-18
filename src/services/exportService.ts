// エクスポートサービス
// ヘルスデータのエクスポート統合処理
// 特定のサービスに依存しない設計で将来の拡張に対応

import type { HealthData } from '../types/health';
import { getAccessToken } from './googleAuth';
import { checkFolderExists, findOrCreateFolder, DEFAULT_FOLDER_NAME } from './googleDrive';
import {
    findSpreadsheet,
    createSpreadsheet,
    getSheetData,
    updateHeaders,
    updateRows,
} from './googleSheets';

// スプレッドシートの固定ヘッダー（動的エクササイズカラムを除く）
export const FIXED_HEADERS = [
    'Date',
    'Day of Week',
    'Steps',
    'Weight (kg)',
    'Body Fat (%)',
    'Calories Burned (kcal)',
    'BMR (kcal/day)',
    'Sleep (hours)',
    'Deep Sleep (%)',
    'Calories (kcal)',
    'Protein (g)',
    'Total Fat (g)',
    'Total Carbs (g)',
    'Fiber (g)',
    'Saturated Fat (g)',
    'Exercise: Total (min)',
];

/**
 * 日付文字列から曜日名を取得（デバイスのタイムゾーンを使用）
 * @param dateStr YYYY-MM-DD形式の日付文字列
 * @returns 曜日名（英語）
 */
export function getDayOfWeek(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * HealthDataを行形式に変換
 */
export function formatHealthDataToRows(
    healthData: HealthData,
    existingHeaders: string[]
): {
    headers: string[];
    rows: Map<string, (string | number | null)[]>;
} {
    // すべての日付を収集
    const allDates = new Set<string>();

    healthData.steps.forEach((d) => allDates.add(d.date));
    healthData.weight.forEach((d) => allDates.add(d.date));
    healthData.bodyFat.forEach((d) => allDates.add(d.date));
    healthData.totalCaloriesBurned.forEach((d) => allDates.add(d.date));
    healthData.basalMetabolicRate.forEach((d) => allDates.add(d.date));
    healthData.sleep.forEach((d) => allDates.add(d.date));
    healthData.nutrition.forEach((d) => allDates.add(d.date));
    healthData.exercise.forEach((d) => allDates.add(d.date));

    // エクササイズの種類を収集
    const exerciseTypes = new Set<string>();
    healthData.exercise.forEach((e) => exerciseTypes.add(e.type));

    // 既存ヘッダーからエクササイズカラムを抽出（Totalは除外）
    const existingExerciseTypes = new Set<string>();
    existingHeaders.forEach((h) => {
        const match = h.match(/^Exercise: (.+) \(min\)$/);
        if (match && match[1] !== 'Total') {
            existingExerciseTypes.add(match[1]);
        }
    });

    // すべてのエクササイズタイプを結合
    const allExerciseTypes = [...new Set([...existingExerciseTypes, ...exerciseTypes])].sort();

    // 最終的なヘッダーを作成
    const headers = [
        ...FIXED_HEADERS,
        ...allExerciseTypes.map((t) => `Exercise: ${t} (min)`),
    ];

    // 日付ごとのデータをマップに変換（高速検索用）
    const stepsMap = new Map(healthData.steps.map((d) => [d.date, d.count]));
    const weightMap = new Map(healthData.weight.map((d) => [d.date, d.value]));
    const bodyFatMap = new Map(healthData.bodyFat.map((d) => [d.date, d.percentage]));
    const caloriesMap = new Map(healthData.totalCaloriesBurned.map((d) => [d.date, d.value]));
    const bmrMap = new Map(healthData.basalMetabolicRate.map((d) => [d.date, d.value]));
    const sleepMap = new Map(healthData.sleep.map((d) => [d.date, d]));
    const nutritionMap = new Map(healthData.nutrition.map((d) => [d.date, d]));

    // エクササイズデータを日付・タイプごとにマップ
    const exerciseMap = new Map<string, Map<string, number>>();
    healthData.exercise.forEach((e) => {
        if (!exerciseMap.has(e.date)) {
            exerciseMap.set(e.date, new Map());
        }
        const dayMap = exerciseMap.get(e.date)!;
        dayMap.set(e.type, (dayMap.get(e.type) || 0) + e.durationMinutes);
    });

    // 各日付の行データを生成
    const rows = new Map<string, (string | number | null)[]>();

    [...allDates].sort().forEach((date) => {
        const sleep = sleepMap.get(date);
        const nutrition = nutritionMap.get(date);
        const dayExercise = exerciseMap.get(date);

        // 総エクササイズ時間を計算
        let totalExerciseMinutes: number | null = null;
        if (dayExercise && dayExercise.size > 0) {
            totalExerciseMinutes = 0;
            for (const minutes of dayExercise.values()) {
                totalExerciseMinutes += minutes;
            }
        }

        const row: (string | number | null)[] = [
            date,
            getDayOfWeek(date),
            stepsMap.get(date) ?? null,
            weightMap.get(date) ?? null,
            bodyFatMap.get(date) ?? null,
            caloriesMap.get(date) ?? null,
            bmrMap.get(date) ?? null,
            sleep?.durationMinutes ? Math.round((sleep.durationMinutes / 60) * 100) / 100 : null,
            sleep?.deepSleepPercentage ?? null,
            nutrition?.calories ?? null,
            nutrition?.protein ?? null,
            nutrition?.totalFat ?? null,
            nutrition?.totalCarbohydrate ?? null,
            nutrition?.dietaryFiber ?? null,
            nutrition?.saturatedFat ?? null,
            totalExerciseMinutes,
        ];

        // 動的エクササイズカラムを追加（種類ごと）
        allExerciseTypes.forEach((type) => {
            row.push(dayExercise?.get(type) ?? null);
        });

        rows.set(date, row);
    });

    return { headers, rows };
}

/**
 * ヘルスデータをスプレッドシートにエクスポート
 */
export async function exportToSpreadsheet(
    healthData: HealthData,
    folderId?: string,
    folderName?: string
): Promise<{ success: boolean; spreadsheetId?: string; folderId?: string; error?: string }> {
    try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            return { success: false, error: 'アクセストークンがありません。サインインしてください。' };
        }

        // フォルダIDの検証と準備
        let targetFolderId = folderId;

        if (targetFolderId) {
            // 指定されたフォルダが存在するか確認
            const folderExists = await checkFolderExists(targetFolderId, accessToken);
            if (!folderExists) {
                console.log('[Export] Specified folder not found, falling back to default');
                targetFolderId = undefined;
            }
        }

        if (!targetFolderId) {
            // フォルダを検索/作成（指定された名前またはデフォルト名を使用）
            const targetFolderName = folderName || DEFAULT_FOLDER_NAME;
            targetFolderId = await findOrCreateFolder(targetFolderName, accessToken) ?? undefined;
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
            let spreadsheetId = await findSpreadsheet(year, accessToken, targetFolderId);
            let existingHeaders: string[] = [];
            let existingRows: string[][] = [];

            if (spreadsheetId) {
                const sheetData = await getSheetData(spreadsheetId, accessToken);
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
                spreadsheetId = await createSpreadsheet(year, newHeaders, accessToken, targetFolderId);
                if (!spreadsheetId) {
                    return { success: false, error: `${year}年のスプレッドシート作成に失敗しました` };
                }
            } else {
                // ヘッダーが変更された場合は更新
                if (newHeaders.length > existingHeaders.length) {
                    const updateResult = await updateHeaders(spreadsheetId, newHeaders, accessToken);
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
                const success = await updateRows(spreadsheetId, 2, allRows, accessToken);
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
