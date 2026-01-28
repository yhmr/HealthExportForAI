/**
 * Key-Value形式のストレージインターフェース
 * (AsyncStorageの抽象化)
 */
export interface IKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  // 必要に応じて clear() や getAllKeys() などを追加
}
