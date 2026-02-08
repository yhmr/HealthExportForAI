import { formatDate } from './formatters';

type Dated = { date: string };

/**
 * date(YYYY-MM-DD) を昇順でソートする
 */
export function sortByDate<T extends Dated>(records: T[]): T[] {
  return [...records].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 日付ごとに最新のレコードを集計するヘルパー
 */
export function aggregateByLatestPerDay<TRecord, TData extends Dated & { time?: string }>(
  records: TRecord[],
  getTime: (record: TRecord) => string,
  transform: (record: TRecord, date: string) => TData
): TData[] {
  const aggregation: Record<string, TData> = {};

  for (const record of records) {
    const time = getTime(record);
    // formatDateはローカルタイムゾーン基準。
    // そのため「1日の区切り」は端末ローカル時間で判定される。
    const date = formatDate(time);
    const current = aggregation[date];

    // 同じ日付のデータがあれば、より新しい時刻のものを採用
    if (!current || new Date(time) > new Date(current.time || '')) {
      aggregation[date] = transform(record, date);
    }
  }

  return sortByDate(Object.values(aggregation));
}

/**
 * 日付単位で任意の集計を行う共通ヘルパー
 */
export function reduceByDate<TRecord, TData extends Dated>(
  records: TRecord[],
  getTime: (record: TRecord) => string,
  createInitial: (date: string) => TData,
  merge: (current: TData, record: TRecord) => void
): TData[] {
  const aggregation: Record<string, TData> = {};

  for (const record of records) {
    // aggregateByLatestPerDayと同じくローカル日付で集計する。
    const date = formatDate(getTime(record));
    const current = aggregation[date] ?? createInitial(date);
    merge(current, record);
    aggregation[date] = current;
  }

  return sortByDate(Object.values(aggregation));
}
