// ネットワーク状態監視サービス

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/** ネットワーク状態の種類 */
export type NetworkStatus = 'online' | 'offline' | 'unknown';

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

/**
 * 現在のネットワーク状態を取得
 * @returns Promise<NetworkStatus> 現在のネットワーク状態
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
    try {
        const state = await NetInfo.fetch();
        return toNetworkStatus(state);
    } catch (error) {
        console.error('[NetworkService] Failed to get network status:', error);
        return 'unknown';
    }
}

/**
 * ネットワーク状態の変化を購読
 * @param callback 状態変化時に呼ばれるコールバック関数
 * @returns 購読解除関数
 */
export function subscribeToNetworkChanges(
    callback: (status: NetworkStatus) => void
): () => void {
    const unsubscribe = NetInfo.addEventListener((state) => {
        const status = toNetworkStatus(state);
        console.log(`[NetworkService] Network status changed: ${status}`);
        callback(status);
    });

    return unsubscribe;
}

/**
 * インターネット接続があるかどうかを確認
 * isConnectedだけでなく、isInternetReachableも考慮
 * @returns Promise<boolean> インターネットに到達可能な場合true
 */
export async function isInternetReachable(): Promise<boolean> {
    try {
        const state = await NetInfo.fetch();
        // isInternetReachableがnullの場合はisConnectedで判断
        return state.isInternetReachable ?? state.isConnected ?? false;
    } catch (error) {
        console.error('[NetworkService] Failed to check internet reachability:', error);
        return false;
    }
}
