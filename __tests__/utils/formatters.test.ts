// formatters ユーティリティのテスト

import { describe, expect, it, vi } from 'vitest';
import {
  formatDate,
  generateDateRange,
  getCurrentISOString,
  getDateDaysAgo,
  getEndOfToday
} from '../../src/utils/formatters';

describe('formatters', () => {
  describe('formatDate', () => {
    it('ISO文字列をYYYY-MM-DD形式に変換する', () => {
      const result = formatDate('2026-01-16T17:00:00+09:00');
      expect(result).toBe('2026-01-16');
    });

    it('UTCの日付も正しく変換する', () => {
      const result = formatDate('2026-01-16T00:00:00Z');
      expect(result).toBe('2026-01-16');
    });
  });

  describe('getDateDaysAgo', () => {
    it('指定日数前の日付を返す', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysAgo = getDateDaysAgo(7);
      const diffTime = today.getTime() - sevenDaysAgo.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
    });

    it('時刻が00:00:00にリセットされる', () => {
      const result = getDateDaysAgo(1);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });

  describe('getCurrentISOString', () => {
    it('現在のISO日時文字列を返す', () => {
      const mockDate = new Date('2026-01-01T12:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      expect(getCurrentISOString()).toBe('2026-01-01T12:00:00.000Z');

      vi.useRealTimers();
    });
  });

  describe('getEndOfToday', () => {
    it('今日の終わりの日時(23:59:59.999)を返す', () => {
      const mockDate = new Date('2026-01-01T12:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const result = getEndOfToday();
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0); // 0-indexed, so January is 0
      expect(result.getDate()).toBe(1);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);

      vi.useRealTimers();
    });
  });

  describe('generateDateRange', () => {
    it('開始日から終了日までのすべての日付を生成する', () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-03');
      const result = generateDateRange(startDate, endDate);

      expect(result.size).toBe(3);
      expect(result.has('2026-01-01')).toBe(true);
      expect(result.has('2026-01-02')).toBe(true);
      expect(result.has('2026-01-03')).toBe(true);
    });

    it('開始日と終了日が同じ場合、1日分のみ生成する', () => {
      const date = new Date('2026-01-01');
      const result = generateDateRange(date, date);
      expect(result.size).toBe(1);
      expect(result.has('2026-01-01')).toBe(true);
    });
  });
});
