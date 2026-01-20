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

/**
 * 同期間隔（分）
 * 1h, 3h, 6h, 12h, 24h, 48h, 72h
 */
export type SyncInterval = 60 | 180 | 360 | 720 | 1440 | 2880 | 4320;

/**
 * 自動同期の設定
 */
export interface AutoSyncConfig {
    /** 自動同期の有効/無効 */
    enabled: boolean;
    /** 同期間隔（分） */
    intervalMinutes: SyncInterval;
    /** Wi-Fi接続時のみ同期するか */
    wifiOnly: boolean;
}
