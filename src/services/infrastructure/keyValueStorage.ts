import { AsyncStorageAdapter } from './AsyncStorageAdapter';

/**
 * アプリケーション全体で共有するストレージインスタンス
 * (AsyncStorageの抽象化への単一アクセスポイント)
 */
export const keyValueStorage = new AsyncStorageAdapter();
