import { formatDate } from './formatters';

/**
 * 日付ごとに最新のレコードを集計するヘルパー
 */
export function aggregateByLatestPerDay<TRecord, TData>(
  records: TRecord[],
  getTime: (record: TRecord) => string,
  transform: (record: TRecord, date: string) => TData & { time?: string }
): TData[] {
  const aggregation: Record<string, TData & { time?: string }> = {};

  for (const record of records) {
    const time = getTime(record);
    const date = formatDate(time);

    // 同じ日付のデータがあれば、より新しい時刻のものを採用
    if (!aggregation[date] || new Date(time) > new Date(aggregation[date].time || '')) {
      aggregation[date] = transform(record, date);
    }
  }

  // 日付順にソートしてタイムスタンプ情報を除外して返す
  return Object.values(aggregation).sort((a, b) => (a as any).date.localeCompare((b as any).date));
}
