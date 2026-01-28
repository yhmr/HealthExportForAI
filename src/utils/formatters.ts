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
