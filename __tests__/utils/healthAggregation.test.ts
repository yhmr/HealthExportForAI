import { describe, expect, it } from 'vitest';
import {
  aggregateByLatestPerDay,
  reduceByDate,
  sortByDate
} from '../../src/utils/healthAggregation';

describe('healthAggregation utilities', () => {
  it('sortByDate should return sorted copy without mutating original', () => {
    const source = [{ date: '2025-01-02' }, { date: '2025-01-01' }];

    const sorted = sortByDate(source);

    expect(sorted).toEqual([{ date: '2025-01-01' }, { date: '2025-01-02' }]);
    expect(source).toEqual([{ date: '2025-01-02' }, { date: '2025-01-01' }]);
  });

  it('aggregateByLatestPerDay should keep only latest record per day', () => {
    const records = [
      { time: '2025-01-01T01:00:00.000Z', value: 1 },
      { time: '2025-01-01T03:00:00.000Z', value: 2 },
      { time: '2025-01-02T01:00:00.000Z', value: 3 }
    ];

    const result = aggregateByLatestPerDay(
      records,
      (record) => record.time,
      (record, date) => ({ date, time: record.time, value: record.value })
    );

    expect(result).toEqual([
      { date: '2025-01-01', time: '2025-01-01T03:00:00.000Z', value: 2 },
      { date: '2025-01-02', time: '2025-01-02T01:00:00.000Z', value: 3 }
    ]);
  });

  it('reduceByDate should aggregate values by date', () => {
    const records = [
      { startTime: '2025-01-01T00:10:00', amount: 10 },
      { startTime: '2025-01-01T23:50:00', amount: 5 },
      { startTime: '2025-01-02T12:00:00', amount: 7 }
    ];

    const result = reduceByDate(
      records,
      (record) => record.startTime,
      (date) => ({ date, total: 0 }),
      (current, record) => {
        current.total += record.amount;
      }
    );

    expect(result).toEqual([
      { date: '2025-01-01', total: 15 },
      { date: '2025-01-02', total: 7 }
    ]);
  });
});
