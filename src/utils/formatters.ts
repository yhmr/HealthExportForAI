// データフォーマッター

/**
 * 日付をISO文字列からYYYY-MM-DD形式に変換（ローカルタイムゾーン使用）
 */
export function formatDate(isoString: string): string {
    const date = new Date(isoString);
    // ローカルタイムゾーンでの日付を取得
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 分数を時間と分の文字列に変換
 */
export function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}

/**
 * 数値をカンマ区切りでフォーマット
 */
export function formatNumber(value: number): string {
    return value.toLocaleString('ja-JP');
}

/**
 * 日時をローカルフォーマットに変換
 */
export function formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * 現在のISO日時文字列を取得
 */
export function getCurrentISOString(): string {
    return new Date().toISOString();
}

/**
 * 指定日数前の日付を取得
 */
export function getDateDaysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0);
    return date;
}

/**
 * 今日の終わりの日時を取得
 */
export function getEndOfToday(): Date {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
}

/**
 * 開始日から終了日までのすべての日付を生成（YYYY-MM-DD形式）
 */
export function generateDateRange(startDate: Date, endDate: Date): Set<string> {
    const dates = new Set<string>();
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        dates.add(`${year}-${month}-${day}`);
        current.setDate(current.getDate() + 1);
    }

    return dates;
}
