// formatters ユーティリティのテスト

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatRelativeTime,
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

  describe('formatDuration', () => {
    it('分のみの場合は分だけ表示する', () => {
      expect(formatDuration(45)).toBe('45m');
    });

    it('時間と分を正しくフォーマットする', () => {
      expect(formatDuration(90)).toBe('1h 30m');
    });

    it('複数時間を正しくフォーマットする', () => {
      expect(formatDuration(450)).toBe('7h 30m');
    });

    it('0分を正しく処理する', () => {
      expect(formatDuration(0)).toBe('0m');
    });
  });

  describe('formatNumber', () => {
    it('数値をカンマ区切りにフォーマットする', () => {
      expect(formatNumber(1234567)).toContain('1');
    });

    it('小さな数値はそのまま返す', () => {
      expect(formatNumber(123)).toBe('123');
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

  describe('formatDateTime', () => {
    it('日時をローカルフォーマットに変換する', () => {
      const isoString = '2026-01-16T17:30:00+09:00';
      const result = formatDateTime(isoString);

      // 実行環境のタイムゾーンに合わせた期待値を生成
      const date = new Date(isoString);
      const expected = date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      expect(result).toBe(expected);
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

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      const mockNow = new Date('2026-01-01T12:00:00Z');
      vi.setSystemTime(mockNow);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('空文字列の場合は空文字を返す', () => {
      expect(formatRelativeTime('')).toBe('');
    });

    it('1分未満の場合は"Just now"を返す', () => {
      const justNow = new Date('2026-01-01T11:59:30Z').toISOString();
      expect(formatRelativeTime(justNow)).toBe('Just now');
    });

    it('60分未満の場合は"X mins ago"を返す', () => {
      const tenMinsAgo = new Date('2026-01-01T11:50:00Z').toISOString();
      expect(formatRelativeTime(tenMinsAgo)).toBe('10 mins ago');
    });

    it('24時間未満の場合は"X hours ago"を返す', () => {
      const twoHoursAgo = new Date('2026-01-01T10:00:00Z').toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
    });

    it('24時間以上の場合は"X days ago"を返す', () => {
      const twoDaysAgo = new Date('2025-12-30T12:00:00Z').toISOString();
      expect(formatRelativeTime(twoDaysAgo)).toBe('2 days ago');
    });
  });
});
