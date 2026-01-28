import { useCallback, useState } from 'react';
import { SyncService } from '../services/syncService';
import { useHealthStore } from '../stores/healthStore';

export interface UseSyncOperationResult {
  isSyncing: boolean;
  syncError: string | null;
  syncAndUpload: (
    periodDays?: number
  ) => Promise<{ success: boolean; queued: boolean; uploaded: boolean }>;
}

/**
 * 同期・アップロード操作をUIから実行するためのフック
 * SyncService.syncAndUpload をラップし、Loading/Error状態を管理する
 */
export function useSyncOperation(): UseSyncOperationResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const { setLastSyncTime, setAllData } = useHealthStore();

  const handleSyncAndUpload = useCallback(
    async (periodDays?: number) => {
      setIsSyncing(true);
      setSyncError(null);

      try {
        const { selectedDataTags } = useHealthStore.getState();
        const tags = Array.from(selectedDataTags || []);

        // SyncServiceに集約されたメソッドを呼び出す
        const { syncResult, exportResult } = await SyncService.syncAndUpload(
          periodDays,
          false, // forceFullSync
          tags
        );

        // 成功時のState更新（Storeへのデータ反映）
        if (syncResult.success) {
          setAllData(syncResult.data, syncResult.dateRange);
          setLastSyncTime(syncResult.endTime);
        }

        // UIへの結果返却用オブジェクト生成
        const uploaded = exportResult ? exportResult.successCount > 0 : false;

        if (!syncResult.success) {
          throw new Error('Sync failed to fetch data');
        }

        // アップロードのエラーハンドリング（部分失敗など）はここで拾うか、
        // あるいはログに残すだけにするか。ここではエラーがあればStateに入れる。
        if (exportResult && exportResult.errors.length > 0 && exportResult.successCount === 0) {
          // 全件失敗した場合
          throw new Error(`Export failed: ${exportResult.errors.join(', ')}`);
        }

        return {
          success: true,
          queued: syncResult.queued,
          uploaded
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setSyncError(message);
        return { success: false, queued: false, uploaded: false };
      } finally {
        setIsSyncing(false);
      }
    },
    [setLastSyncTime, setAllData]
  );

  return {
    isSyncing,
    syncError,
    syncAndUpload: handleSyncAndUpload
  };
}
