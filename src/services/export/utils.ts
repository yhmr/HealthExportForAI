// エクスポート共通ユーティリティ
// データ整形やヘッダー定義など、各エクスポート形式で共通して使用される機能

import type { HealthData } from '../../types/health';

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
 * 年ベースのファイル名を生成（全形式共通）
 * 基本形式: "Health Data YYYY"
 * @param year 対象年
 * @param extension ファイル拡張子（省略可）
 * @param useUnderscore 空白をアンダースコアに置換するか（デフォルト: false）
 */
export function getExportFileName(year: number, extension?: string, useUnderscore: boolean = false): string {
    const baseName = useUnderscore ? `Health_Data_${year}` : `Health Data ${year}`;
    return extension ? `${baseName}.${extension}` : baseName;
}

/**
 * ファイル名から年を抽出（検索用）
 */
export function getExportFileSearchName(year: number, extension: string, useUnderscore: boolean = false): string {
    return getExportFileName(year, extension, useUnderscore);
}

/**
 * HealthDataを行形式に変換
 * @param healthData エクスポートするデータ
 * @param existingHeaders 既存のヘッダー（ヘッダーマージ用）
 * @param additionalDates 追加で含める日付（フィルタリング前の元データの日付など）
 */
export function formatHealthDataToRows(
    healthData: HealthData,
    existingHeaders: string[],
    additionalDates?: Set<string>
): {
    headers: string[];
    rows: Map<string, (string | number | null)[]>;
} {
    // すべての日付を収集
    const allDates = new Set<string>();

    // 追加日付がある場合は先に追加
    if (additionalDates) {
        for (const date of additionalDates) {
            allDates.add(date);
        }
    }

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
 * ヘルスデータから最小日付を取得
 */
export function getMinDate(healthData: HealthData): string {
    const allDates = [
        ...healthData.steps.map(d => d.date),
        ...healthData.weight.map(d => d.date),
        ...healthData.sleep.map(d => d.date),
        ...healthData.exercise.map(d => d.date),
        ...healthData.nutrition.map(d => d.date),
    ];
    return allDates.length > 0 ? allDates.sort()[0] : 'N/A';
}

/**
 * ヘルスデータから最大日付を取得
 */
export function getMaxDate(healthData: HealthData): string {
    const allDates = [
        ...healthData.steps.map(d => d.date),
        ...healthData.weight.map(d => d.date),
        ...healthData.sleep.map(d => d.date),
        ...healthData.exercise.map(d => d.date),
        ...healthData.nutrition.map(d => d.date),
    ];
    return allDates.length > 0 ? allDates.sort().pop()! : 'N/A';
}
