// Google Sheets サービス
// 年ごとのスプレッドシートにヘルスデータをエクスポート

import type { HealthData } from '../types/health';
import { getAccessToken } from './googleAuth';

const SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';

// デフォルトの保存フォルダ名
export const DEFAULT_FOLDER_NAME = 'Health Export For AI Data';

// スプレッドシートの固定ヘッダー（動的エクササイズカラムを除く）
const FIXED_HEADERS = [
    'Date',
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
 * 年からスプレッドシート名を生成
 */
export function getSpreadsheetName(year: number): string {
    return `Health Data ${year}`;
}

/**
 * 指定した年のスプレッドシートを検索
 */
export async function findSpreadsheet(
    year: number,
    accessToken: string
): Promise<string | null> {
    const name = getSpreadsheetName(year);
    const query = `mimeType='application/vnd.google-apps.spreadsheet' and name='${name}' and trashed=false`;

    const response = await fetch(
        `${DRIVE_API_URL}?q=${encodeURIComponent(query)}`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );

    if (!response.ok) {
        console.error('スプレッドシート検索エラー:', response.status);
        return null;
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
        return data.files[0].id;
    }
    return null;
}

/**
 * 指定した名前のフォルダを検索または作成
 */
export async function findOrCreateFolder(
    folderName: string,
    accessToken: string
): Promise<string | null> {
    try {
        // 1. フォルダを検索
        const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
        const searchResponse = await fetch(
            `${DRIVE_API_URL}?q=${encodeURIComponent(query)}`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (searchResponse.ok) {
            const data = await searchResponse.json();
            if (data.files && data.files.length > 0) {
                return data.files[0].id;
            }
        }

        // 2. フォルダがなければ作成
        const createResponse = await fetch(DRIVE_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
            }),
        });

        if (createResponse.ok) {
            const data = await createResponse.json();
            return data.id;
        }
        return null;
    } catch (error) {
        console.error('フォルダ作成エラー:', error);
        return null;
    }
}

/**
 * 新しいスプレッドシートを作成
 */
export async function createSpreadsheet(
    year: number,
    headers: string[],
    accessToken: string,
    folderId?: string
): Promise<string | null> {
    const name = getSpreadsheetName(year);

    const response = await fetch(SHEETS_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            properties: {
                title: name,
            },
            sheets: [
                {
                    properties: {
                        title: 'Health Data',
                        index: 0,
                    },
                    data: [
                        {
                            startRow: 0,
                            startColumn: 0,
                            rowData: [
                                {
                                    values: headers.map((h) => ({
                                        userEnteredValue: { stringValue: h },
                                        userEnteredFormat: { textFormat: { bold: true } },
                                    })),
                                },
                            ],
                        },
                    ],
                },
            ],
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('スプレッドシート作成エラー:', error);
        return null;
    }

    const data = await response.json();
    const spreadsheetId = data.spreadsheetId;

    // フォルダが指定されている場合、スプレッドシートをそのフォルダに移動
    if (spreadsheetId && folderId) {
        await moveToFolder(spreadsheetId, folderId, accessToken);
    }

    return spreadsheetId;
}

/**
 * ファイルを指定フォルダに移動
 */
async function moveToFolder(
    fileId: string,
    folderId: string,
    accessToken: string
): Promise<boolean> {
    try {
        // 現在の親フォルダを取得
        const getResponse = await fetch(
            `${DRIVE_API_URL}/${fileId}?fields=parents`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        if (!getResponse.ok) return false;

        const fileData = await getResponse.json();
        const previousParents = (fileData.parents || []).join(',');

        // 新しいフォルダに移動
        const moveResponse = await fetch(
            `${DRIVE_API_URL}/${fileId}?addParents=${folderId}&removeParents=${previousParents}`,
            {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        return moveResponse.ok;
    } catch (error) {
        console.error('ファイル移動エラー:', error);
        return false;
    }
}

/**
 * スプレッドシートの既存データを取得
 */
export async function getSheetData(
    spreadsheetId: string,
    accessToken: string
): Promise<{ headers: string[]; rows: string[][] } | null> {
    const response = await fetch(
        `${SHEETS_API_URL}/${spreadsheetId}/values/Health Data!A:ZZ`,
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        }
    );

    if (!response.ok) {
        console.error('シートデータ取得エラー:', response.status);
        return null;
    }

    const data = await response.json();
    const values = data.values || [];

    if (values.length === 0) {
        return { headers: [], rows: [] };
    }

    return {
        headers: values[0] as string[],
        rows: values.slice(1) as string[][],
    };
}

/**
 * ヘッダー行を更新（エクササイズの動的カラム追加時）
 */
export async function updateHeaders(
    spreadsheetId: string,
    headers: string[],
    accessToken: string
): Promise<boolean> {
    const response = await fetch(
        `${SHEETS_API_URL}/${spreadsheetId}/values/Health Data!A1:${columnToLetter(headers.length)}1?valueInputOption=RAW`,
        {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                values: [headers],
            }),
        }
    );

    return response.ok;
}

/**
 * 行データを更新または追加
 */
export async function updateRows(
    spreadsheetId: string,
    startRow: number,
    rows: (string | number | null)[][],
    accessToken: string
): Promise<boolean> {
    if (rows.length === 0) return true;

    const maxCols = Math.max(...rows.map((r) => r.length));
    const endCol = columnToLetter(maxCols);
    const endRow = startRow + rows.length - 1;
    const range = `Health Data!A${startRow}:${endCol}${endRow}`;

    const response = await fetch(
        `${SHEETS_API_URL}/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
        {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                values: rows,
            }),
        }
    );

    return response.ok;
}

/**
 * 列番号を列文字に変換（1 -> A, 27 -> AA）
 */
function columnToLetter(column: number): string {
    let result = '';
    let temp = column;

    while (temp > 0) {
        const remainder = (temp - 1) % 26;
        result = String.fromCharCode(65 + remainder) + result;
        temp = Math.floor((temp - 1) / 26);
    }

    return result;
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
    folderId?: string
): Promise<{ success: boolean; spreadsheetId?: string; folderId?: string; error?: string }> {
    try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            return { success: false, error: 'アクセストークンがありません。サインインしてください。' };
        }

        // フォルダIDがない場合、デフォルトフォルダを検索/作成
        let targetFolderId = folderId;
        if (!targetFolderId) {
            targetFolderId = await findOrCreateFolder(DEFAULT_FOLDER_NAME, accessToken) ?? undefined;
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

        // 年ごとのHealthDataを作成
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
            // スプレッドシートを検索
            let spreadsheetId = await findSpreadsheet(year, accessToken);
            let existingHeaders: string[] = [];
            let existingRows: string[][] = [];

            if (spreadsheetId) {
                // 既存シートのデータを取得
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
                    // 既存データを新しいヘッダー長に合わせてパディング
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
            // nullを空文字列に変換（スプレッドシートで既存値をクリアするため）
            const allRows = [...existingRowMap.entries()]
                .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                .map(([, data]) => data.map((v) => (v === null ? '' : v)));

            // 全データを一括で書き込み（ヘッダー行の次から）
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
