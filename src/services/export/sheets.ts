// Google Sheetsエクスポート
// ヘルスデータをGoogle Spreadsheetsにエクスポート

import type { HealthData } from '../../types/health';
import type { SpreadsheetAdapter } from '../storage/interfaces';
import { formatHealthDataToRows, getExportFileName } from './utils';

/**
 * ヘルスデータをスプレッドシートにエクスポート
 * @param healthData エクスポートするデータ
 * @param folderId フォルダID（確定済み）
 * @param spreadsheetAdapter スプレッドシートアダプター
 * @param originalDates フィルタリング前の元データの全日付（空行を維持するため）
 */
export async function exportToSpreadsheet(
  healthData: HealthData,
  folderId: string | undefined,
  spreadsheetAdapter: SpreadsheetAdapter,
  originalDates: Set<string>
): Promise<{
  success: boolean;
  exportedSheets: { year: number; spreadsheetId: string }[];
  folderId?: string;
  error?: string;
}> {
  const exportedSheets: { year: number; spreadsheetId: string }[] = [];
  try {
    // 対象の年を取得（データの最新日付から）
    // originalDatesがあればそれも含める（フィルタリングでデータが空になった日付も行として出力するため）
    const allDates = [
      ...healthData.steps.map((d) => d.date),
      ...healthData.weight.map((d) => d.date),
      ...healthData.sleep.map((d) => d.date),
      ...Array.from(originalDates)
    ];

    if (allDates.length === 0) {
      return { success: false, exportedSheets: [], error: 'エクスポートするデータがありません' };
    }

    // 年ごとにデータを分割
    const dataByYear = new Map<number, HealthData>();
    const getYear = (date: string) => new Date(date).getFullYear();

    const years = new Set<number>();
    allDates.forEach((date) => years.add(getYear(date)));

    for (const year of years) {
      const filterByYear = <T extends { date: string }>(items: T[]) =>
        items.filter((item) => getYear(item.date) === year);

      dataByYear.set(year, {
        steps: filterByYear(healthData.steps),
        weight: filterByYear(healthData.weight),
        bodyFat: filterByYear(healthData.bodyFat),
        totalCaloriesBurned: filterByYear(healthData.totalCaloriesBurned),
        basalMetabolicRate: filterByYear(healthData.basalMetabolicRate),
        sleep: filterByYear(healthData.sleep),
        exercise: filterByYear(healthData.exercise),
        nutrition: filterByYear(healthData.nutrition)
      });
    }

    // 各年のデータを処理
    for (const [year, yearData] of dataByYear) {
      const fileName = getExportFileName(year);
      // ファイル名を渡す
      let spreadsheetId = await spreadsheetAdapter.findSpreadsheet(fileName, folderId);
      let existingHeaders: string[] = [];
      let existingRows: string[][] = [];

      if (spreadsheetId) {
        const sheetData = await spreadsheetAdapter.getSheetData(spreadsheetId);
        if (sheetData) {
          existingHeaders = sheetData.headers;
          existingRows = sheetData.rows;
        }
      }

      // データを行形式に変換（originalDatesから年に該当する日付を抜出）
      const yearOriginalDates = new Set(
        [...originalDates].filter((d) => new Date(d).getFullYear() === year)
      );
      const { headers: newHeaders, rows: newRowsMap } = formatHealthDataToRows(
        yearData,
        existingHeaders,
        yearOriginalDates
      );

      // スプレッドシートが存在しない場合は新規作成
      if (!spreadsheetId) {
        // ファイル名を渡す
        spreadsheetId = await spreadsheetAdapter.createSpreadsheet(fileName, newHeaders, folderId);
        if (!spreadsheetId) {
          return {
            success: false,
            exportedSheets: [],
            error: `${year}年のスプレッドシート作成に失敗しました`
          };
        }
      } else {
        // ヘッダーが変更された場合は更新
        if (newHeaders.length > existingHeaders.length) {
          const updateResult = await spreadsheetAdapter.updateHeaders(spreadsheetId, newHeaders);
          if (!updateResult) {
            console.error('ヘッダー更新に失敗しました');
          }
        }
      }

      // 既存の日付行をマップに変換
      const existingRowMap = new Map<string, (string | number | null)[]>();
      existingRows.forEach((row) => {
        if (row[0]) {
          const paddedRow: (string | number | null)[] = [...row];
          while (paddedRow.length < newHeaders.length) {
            paddedRow.push(null);
          }
          existingRowMap.set(row[0], paddedRow);
        }
      });

      // 新しいデータの日付範囲を取得
      const newDates = [...newRowsMap.keys()].sort();
      const minNewDate = newDates.length > 0 ? newDates[0] : null;
      const maxNewDate = newDates.length > 0 ? newDates[newDates.length - 1] : null;

      // 新しいデータの日付範囲内にある既存データを削除
      // （取得期間内のデータは完全に新しいデータで置き換える）
      if (minNewDate && maxNewDate) {
        for (const existingDate of existingRowMap.keys()) {
          if (existingDate >= minNewDate && existingDate <= maxNewDate) {
            existingRowMap.delete(existingDate);
          }
        }
      }

      // 新規データを追加
      for (const [date, rowData] of newRowsMap) {
        existingRowMap.set(date, rowData);
      }

      // 全データを日付順にソートして配列に変換
      const allRows = [...existingRowMap.entries()]
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([, data]) => data.map((v) => (v === null ? '' : v)));

      // 全データを一括で書き込み
      if (allRows.length > 0) {
        const success = await spreadsheetAdapter.updateRows(spreadsheetId, 2, allRows);
        if (!success) {
          console.error('データ書き込みに失敗しました');
        }
      }

      exportedSheets.push({ year, spreadsheetId });
    }

    return { success: true, exportedSheets, folderId };
  } catch (error) {
    console.error('スプレッドシートエクスポートエラー:', error);
    return {
      success: false,
      exportedSheets: [],
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}
