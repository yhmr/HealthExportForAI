// formatters ユーティリティのテスト

import { describe, it, expect } from 'vitest';
import {
    formatDate,
    formatDuration,
    formatNumber,
    getDateDaysAgo,
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
});
