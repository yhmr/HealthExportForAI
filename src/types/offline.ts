// オフラインキュー用の型定義

import type { HealthData } from './health';

/**
 * 同期待ちのエクスポートエントリ
 * オフライン時にキューに追加され、オンライン復帰時に処理される
 */
export interface PendingExport {
    /** ユニークID（UUID形式） */
    id: string;
    /** 作成日時（ISO 8601形式） */
    createdAt: string;
    /** エクスポートするヘルスデータ */
    healthData: HealthData;
    /** 選択されたデータタグ（配列形式でシリアライズ） */
    selectedTags: string[];
    /** 同期日付範囲（配列形式でシリアライズ、nullの場合は全期間） */
    syncDateRange: string[] | null;
    /** リトライ回数（失敗するごとにインクリメント） */
    retryCount: number;
    /** 最後に発生したエラーメッセージ */
    lastError?: string;
}

/**
 * オフラインキューの永続化形式
 * AsyncStorageに保存される形式
 */
export interface OfflineQueueData {
    /** 待機中のエクスポートリスト */
    pending: PendingExport[];
    /** 最後に更新された日時 */
    updatedAt: string;
}
