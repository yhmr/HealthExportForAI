// エクスポートモジュール - バレルファイル（Barrel File）
//
// バレルファイルとは:
// ディレクトリの公開APIを一箇所に集約し、外部からのインポートを簡潔にするパターン。
// これにより、ディレクトリ内の実装詳細を隠蔽し、公開インターフェースを明確にできる。
//
// 使用例:
//   import { executeExport, exportToCSV } from '../services/export';
//   ↑ 個別ファイルのパスを指定せずにインポート可能

// 制御サービス
export { executeExport, type ExportResults } from './controller';

// 各形式のエクスポート
export { exportToSpreadsheet } from './sheets';
export { exportSpreadsheetAsPDF } from './pdf';
export { exportToCSV, type ExportResult, type ExportOptions } from './csv';
export { exportToJSON } from './json';

// ユーティリティ（必要に応じて公開）
export { formatHealthDataToRows, FIXED_HEADERS, getDayOfWeek } from './utils';
