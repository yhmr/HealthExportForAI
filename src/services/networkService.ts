// ネットワーク状態監視サービス

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { addDebugLog } from './debugLogService';

/** ネットワーク状態の種類 */
export type NetworkStatus = 'online' | 'offline' | 'unknown';
/** 接続種別 */
export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'other' | 'offline' | 'unknown';

/**
 * NetInfoStateからNetworkStatusに変換
 * @param state NetInfoの状態オブジェクト
 * @returns 簡略化されたネットワーク状態
 */
function toNetworkStatus(state: NetInfoState): NetworkStatus {
  if (state.isConnected === null) {
    return 'unknown';
  }
  return state.isConnected ? 'online' : 'offline';
}

function toConnectionType(state: NetInfoState): ConnectionType {
  if (state.isConnected === null) {
    return 'unknown';
  }
  if (!state.isConnected) {
    return 'offline';
  }

  switch (state.type) {
    case 'wifi':
      return 'wifi';
    case 'cellular':
      return 'cellular';
    case 'ethernet':
      return 'ethernet';
    default:
      return 'other';
  }
}

/**
 * 現在のネットワーク状態を取得
 * @returns Promise<NetworkStatus> 現在のネットワーク状態
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
  try {
    const state = await NetInfo.fetch();
    return toNetworkStatus(state);
  } catch (error) {
    await addDebugLog(`[NetworkService] Failed to get network status: ${error}`, 'error');
    return 'unknown';
  }
}

/**
 * 現在の接続種別を取得
 */
export async function getConnectionType(): Promise<ConnectionType> {
  try {
    const state = await NetInfo.fetch();
    return toConnectionType(state);
  } catch (error) {
    await addDebugLog(`[NetworkService] Failed to get connection type: ${error}`, 'error');
    return 'unknown';
  }
}

/**
 * ネットワーク状態の変化を購読
 * @param callback 状態変化時に呼ばれるコールバック関数
 * @returns 購読解除関数
 */
export function subscribeToNetworkChanges(callback: (status: NetworkStatus) => void): () => void {
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    const status = toNetworkStatus(state);
    await addDebugLog(`[NetworkService] Network status changed: ${status}`, 'info');
    callback(status);
  });

  return unsubscribe;
}
