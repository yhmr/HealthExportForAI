// ネットワーク状態のZustandストア

import { create } from 'zustand';

/**
 * ネットワーク状態を管理するストアのインターフェース
 */
interface NetworkStore {
  /** オンライン状態かどうか */
  isOnline: boolean;
  /** 接続確認中フラグ */
  isChecking: boolean;
  /** 最後に確認した日時 */
  lastCheckedAt: string | null;

  // アクション
  /** オンライン状態を設定 */
  setOnline: (online: boolean) => void;
  /** 確認中フラグを設定 */
  setChecking: (checking: boolean) => void;
}

/**
 * ネットワーク状態のグローバルストア
 * アプリ全体でネットワーク状態を共有するために使用
 */
export const useNetworkStore = create<NetworkStore>((set) => ({
  // 初期状態: オンラインと仮定（後で実際の状態を取得）
  isOnline: true,
  isChecking: false,
  lastCheckedAt: null,

  setOnline: (isOnline) =>
    set({
      isOnline,
      lastCheckedAt: new Date().toISOString()
    }),

  setChecking: (isChecking) => set({ isChecking })
}));
