
import { describe, it, expect } from 'vitest';
import {
    getExportFileName,
    getExportFileSearchName,
    getMinDate,
    getMaxDate,
    formatHealthDataToRows,
    FIXED_HEADERS
} from '../../../src/services/export/utils';
import type { HealthData } from '../../../src/types/health';

describe('Export Utils', () => {
    describe('getExportFileName', () => {
        it('should generate correct file name for Sheets (default)', () => {
            expect(getExportFileName(2025)).toBe('Health Data 2025');
        });

        it('should generate correct file name with extension', () => {
            expect(getExportFileName(2025, 'csv')).toBe('Health Data 2025.csv');
        });

        it('should generate correct file name with underscores', () => {
            expect(getExportFileName(2025, undefined, true)).toBe('Health_Data_2025');
        });

        it('should generate correct file name with extension and underscores', () => {
            expect(getExportFileName(2025, 'json', true)).toBe('Health_Data_2025.json');
        });
    });

    describe('getExportFileSearchName', () => {
        it('should be consistent with getExportFileName', () => {
            const year = 2025;
            const extension = 'csv';
            const useUnderscore = true;
            expect(getExportFileSearchName(year, extension, useUnderscore))
                .toBe(getExportFileName(year, extension, useUnderscore));
        });
    });

    describe('Date Range Utils', () => {
        const mockHealthData: HealthData = {
            steps: [
                { date: '2025-01-01', count: 1000 },
                { date: '2025-01-05', count: 2000 }
            ],
            weight: [],
            bodyFat: [],
            totalCaloriesBurned: [],
            basalMetabolicRate: [],
            sleep: [
                { date: '2025-01-03', durationMinutes: 480, deepSleepPercentage: 20 }
            ],
            nutrition: [],
            exercise: []
        };

        describe('getMinDate', () => {
            it('should return the earliest date from all data types', () => {
                expect(getMinDate(mockHealthData)).toBe('2025-01-01');
            });

            it('should return N/A for empty data', () => {
                const emptyData: HealthData = {
                    steps: [], weight: [], bodyFat: [], totalCaloriesBurned: [],
                    basalMetabolicRate: [], sleep: [], nutrition: [], exercise: []
                };
                expect(getMinDate(emptyData)).toBe('N/A');
            });
        });

        describe('getMaxDate', () => {
            it('should return the latest date from all data types', () => {
                expect(getMaxDate(mockHealthData)).toBe('2025-01-05');
            });

            it('should return N/A for empty data', () => {
                const emptyData: HealthData = {
                    steps: [], weight: [], bodyFat: [], totalCaloriesBurned: [],
                    basalMetabolicRate: [], sleep: [], nutrition: [], exercise: []
                };
                expect(getMaxDate(emptyData)).toBe('N/A');
            });
        });
    });

    describe('formatHealthDataToRows', () => {
        const mockHealthData: HealthData = {
            steps: [
                { date: '2025-01-01', count: 5000 },
                { date: '2025-01-02', count: 6000 }
            ],
            weight: [
                { date: '2025-01-01', value: 70.5 }
            ],
            bodyFat: [],
            totalCaloriesBurned: [],
            basalMetabolicRate: [],
            sleep: [
                { date: '2025-01-02', durationMinutes: 450, deepSleepPercentage: 25 }
            ],
            nutrition: [],
            exercise: [
                { date: '2025-01-01', type: 'Running', durationMinutes: 30 },
                { date: '2025-01-02', type: 'Walking', durationMinutes: 20 },
                { date: '2025-01-02', type: 'Running', durationMinutes: 15 } // Same day, different type
            ]
        };

        it('should correctly format headers including dynamic exercise types', () => {
            const { headers } = formatHealthDataToRows(mockHealthData, []);

            // Check fixed headers exist
            FIXED_HEADERS.forEach(h => {
                expect(headers).toContain(h);
            });

            // Check dynamic exercise headers
            expect(headers).toContain('Exercise: Running (min)');
            expect(headers).toContain('Exercise: Walking (min)');
        });

        it('should correctly format data rows', () => {
            const { rows } = formatHealthDataToRows(mockHealthData, []);

            const day1 = rows.get('2025-01-01');
            const day2 = rows.get('2025-01-02');

            expect(day1).toBeDefined();
            expect(day2).toBeDefined();

            if (!day1 || !day2) return;

            // Date & Day of Week
            expect(day1[0]).toBe('2025-01-01');
            expect(day1[1]).toBe('Wednesday'); // 2025-01-01 is Wednesday

            // Steps
            expect(day1[2]).toBe(5000);
            expect(day2[2]).toBe(6000);

            // Weight (Day 1 only)
            expect(day1[3]).toBe(70.5);
            expect(day2[3]).toBeNull();

            // Total Exercise Minutes
            // Day 1: 30 (Running)
            expect(day1[15]).toBe(30);
            // Day 2: 20 (Walking) + 15 (Running) = 35
            expect(day2[15]).toBe(35);
        });

        it('should preserve existing exercise headers', () => {
            const existingHeaders = [...FIXED_HEADERS, 'Exercise: Swimming (min)'];
            const { headers } = formatHealthDataToRows(mockHealthData, existingHeaders);

            expect(headers).toContain('Exercise: Swimming (min)');
            expect(headers).toContain('Exercise: Running (min)');
        });
    });
});
