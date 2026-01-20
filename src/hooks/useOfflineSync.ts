// オフライン同期カスタムフック
// ネットワーク状態監視・キュー管理・自動同期を統合

import { useEffect, useCallback, useRef } from 'react';
import { useNetworkStore } from '../stores/networkStore';
import { useOfflineStore } from '../stores/offlineStore';
import { addToQueue, getQueueCount } from '../services/offlineQueueService';
import { processQueue } from '../services/syncService';
import { getNetworkStatus, subscribeToNetworkChanges } from '../services/networkService';
import type { HealthData } from '../types/health';
import type { DataTagKey } from '../stores/healthStore';

/**
 * オフライン同期機能を提供するカスタムフック
 * - アプリ起動時にネットワーク状態とキュー件数を初期化
 * - ネットワーク状態変化を監視
 * - オンライン復帰時に自動同期
 * - オフラインキューへのデータ追加
 */
export function useOfflineSync() {
    const isOnline = useNetworkStore((state) => state.isOnline);
    const setOnline = useNetworkStore((state) => state.setOnline);

    const pendingCount = useOfflineStore((state) => state.pendingCount);
    const isProcessing = useOfflineStore((state) => state.isProcessing);
    const lastError = useOfflineStore((state) => state.lastError);
    const setPendingCount = useOfflineStore((state) => state.setPendingCount);
    const setProcessing = useOfflineStore((state) => state.setProcessing);
    const setError = useOfflineStore((state) => state.setError);

    // 初期化済みフラグ（重複初期化を防止）
    const isInitialized = useRef(false);

    /**
     * キューを処理
     */
    const processQueueNow = useCallback(async () => {
        if (useOfflineStore.getState().isProcessing) return;

        setProcessing(true);
        setError(null);

        try {
            const result = await processQueue();
            if (result.errors.length > 0) {
                setError(result.errors.join('; '));
            }
            const count = await getQueueCount();
            setPendingCount(count);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
            setProcessing(false);
        }
    }, [setProcessing, setError, setPendingCount]);

    /**
     * 初期化とネットワーク監視
     */
    useEffect(() => {
        if (isInitialized.current) return;
        isInitialized.current = true;

        const initialize = async () => {
            const status = await getNetworkStatus();
            setOnline(status === 'online');

            const count = await getQueueCount();
            setPendingCount(count);

            // オンラインで未同期データがあれば自動同期
            if (status === 'online' && count > 0) {
                processQueueNow();
            }
        };

        initialize();

        // ネットワーク状態変化を監視
        const unsubscribe = subscribeToNetworkChanges(async (status) => {
            const online = status === 'online';
            setOnline(online);

            // オンライン復帰時に自動同期
            if (online) {
                const count = await getQueueCount();
                if (count > 0) {
                    processQueueNow();
                }
            }
        });

        return unsubscribe;
    }, [setOnline, setPendingCount, processQueueNow]);

    /**
     * オフラインキューにデータを追加
     */
    const addToOfflineQueue = useCallback(
        async (
            healthData: HealthData,
            selectedTags: Set<DataTagKey>,
            syncDateRange: Set<string> | null
        ): Promise<string> => {
            const id = await addToQueue({
                healthData,
                selectedTags: Array.from(selectedTags),
                syncDateRange: syncDateRange ? Array.from(syncDateRange) : null,
            });
            const count = await getQueueCount();
            setPendingCount(count);
            return id;
        },
        [setPendingCount]
    );

    return {
        isOnline,
        pendingCount,
        isProcessing,
        lastError,
        addToOfflineQueue,
        processQueueNow,
    };
}
