import type { HealthData } from '../../types/health';
import { type Result, err, ok } from '../../types/result'; // Result型をインポート
import { addDebugLog } from '../debugLogService';
import type { FileOperations } from '../storage/types';
import { formatHealthDataToRows, getExportFileName } from './utils';

/**
 * CSVデータをパースして日付→行データのマップに変換
 */
function parseCSV(csvContent: string): Map<string, string[]> {
  const lines = csvContent.split('\n').filter((line) => line.trim());
  const dataMap = new Map<string, string[]>();

  // ヘッダー行をスキップして、データ行を処理
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i]);
    if (row.length > 0 && row[0]) {
      // 日付（最初のカラム）をキーにする
      dataMap.set(row[0], row);
    }
  }

  return dataMap;
}

/**
 * CSV行をパース（ダブルクォート対応）
 */
function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // エスケープされたクォートをスキップ
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

/**
 * CSV形式へのエクスポート（年間データ蓄積対応）
 * @param healthData エクスポートするデータ
 * @param folderId フォルダID（確定済み）
 * @param storageAdapter ストレージアダプター
 */
export async function exportToCSV(
  healthData: HealthData,
  folderId: string | undefined,
  fileOps: FileOperations
): Promise<Result<string | undefined, string>> {
  try {
    // データを行形式に変換
    const { headers, rows: newRowsMap } = formatHealthDataToRows(healthData, []);

    // データの年を取得
    const years = new Set<number>();
    for (const date of newRowsMap.keys()) {
      years.add(new Date(date).getFullYear());
    }

    let lastFileId: string | undefined;

    // 年ごとにファイルを処理
    for (const year of years) {
      // 統一ファイル名を使用（空白はアンダースコアに置換）
      const fileName = getExportFileName(year, 'csv', true);

      // 既存ファイルを検索
      const findResult = await fileOps.findFile(fileName, 'text/csv', folderId);
      if (findResult.isErr()) {
        return err(`CSVファイルの検索に失敗しました: ${findResult.unwrapErr().message}`);
      }
      const existingFile = findResult.unwrap();
      let existingRowMap = new Map<string, string[]>();

      if (existingFile) {
        // 既存ファイルの内容をダウンロード
        const downloadResult = await fileOps.downloadFileContent(existingFile.id);
        if (downloadResult.isOk()) {
          const existingContent = downloadResult.unwrap();
          if (existingContent) {
            existingRowMap = parseCSV(existingContent);
          }
        }
      }

      // 新規データをマージ（日付で上書き）
      // 新しいデータの日付範囲を取得
      const newDates = [...newRowsMap.keys()]
        .filter((date) => new Date(date).getFullYear() === year)
        .sort();
      const minNewDate = newDates.length > 0 ? newDates[0] : null;
      const maxNewDate = newDates.length > 0 ? newDates[newDates.length - 1] : null;

      // 新しいデータの日付範囲内にある既存データを削除
      if (minNewDate && maxNewDate) {
        for (const existingDate of existingRowMap.keys()) {
          if (existingDate >= minNewDate && existingDate <= maxNewDate) {
            existingRowMap.delete(existingDate);
          }
        }
      }

      // 新規データを追加
      for (const [date, rowData] of newRowsMap) {
        if (new Date(date).getFullYear() === year) {
          // 文字列配列に変換
          const stringRow = rowData.map((cell: string | number | null) =>
            cell === null ? '' : String(cell)
          );
          existingRowMap.set(date, stringRow);
        }
      }

      // 日付順にソート
      const sortedDates = [...existingRowMap.keys()].sort();

      // CSVコンテンツを生成
      const csvLines: string[] = [];
      csvLines.push(headers.map((h: string) => `"${h.replace(/"/g, '""')}"`).join(','));

      for (const date of sortedDates) {
        const row = existingRowMap.get(date)!;
        const csvRow = row.map((cell) => {
          const stringCell = cell === null || cell === undefined ? '' : String(cell);
          // カンマ、ダブルクォート、改行が含まれる場合はクォートする
          if (/[",\n\r]/.test(stringCell)) {
            return `"${stringCell.replace(/"/g, '""')}"`;
          }
          return stringCell;
        });
        csvLines.push(csvRow.join(','));
      }

      const csvContent = csvLines.join('\n');

      // アップロード or 更新
      if (existingFile) {
        const updateResult = await fileOps.updateFile(existingFile.id, csvContent, 'text/csv');
        if (updateResult.isOk()) {
          await addDebugLog(`[CSV Export] Updated: ${fileName}`, 'success');
          lastFileId = existingFile.id;
        } else {
          return err(`CSVファイルの更新に失敗しました: ${updateResult.unwrapErr().message}`);
        }
      } else {
        const uploadResult = await fileOps.uploadFile(csvContent, fileName, 'text/csv', folderId);
        if (uploadResult.isOk()) {
          await addDebugLog(`[CSV Export] Created: ${fileName}`, 'success');
          lastFileId = uploadResult.unwrap();
        } else {
          return err(
            `CSVファイルのアップロードに失敗しました: ${uploadResult.unwrapErr().message}`
          );
        }
      }
    }

    return ok(lastFileId);
  } catch (error) {
    await addDebugLog(`[CSV Export] Error: ${error}`, 'error');
    return err(error instanceof Error ? error.message : 'CSVエクスポートに失敗しました');
  }
}
