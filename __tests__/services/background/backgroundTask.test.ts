import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeSyncLogic } from '../../../src/services/background/backgroundTask';
import { getConnectionType } from '../../../src/services/networkService';
import { initializeForSync } from '../../../src/services/syncInitializer';
import { SyncService } from '../../../src/services/syncService';
import { AutoSyncConfig } from '../../../src/types/export';

// Mocks
vi.mock('../../../src/services/syncInitializer');
vi.mock('../../../src/services/syncService', () => ({
  SyncService: {
    executeFullSync: vi.fn()
  }
}));
vi.mock('../../../src/services/networkService', () => ({
  getConnectionType: vi.fn()
}));

vi.mock('../../../src/services/debugLogService', () => ({
  addDebugLog: vi.fn().mockResolvedValue(undefined)
}));

describe('backgroundTask', () => {
  const mockConfig: AutoSyncConfig = {
    enabled: true,
    intervalMinutes: 60,
    wifiOnly: false
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (getConnectionType as any).mockResolvedValue('wifi');
    (initializeForSync as any).mockResolvedValue({ success: true });
    (SyncService.executeFullSync as any).mockResolvedValue({
      isOk: () => true,
      unwrap: () => ({
        syncResult: { success: true, isNewData: false },
        exportResult: { successCount: 0 }
      })
    });
  });

  it('checks config.enabled BEFORE initialization', async () => {
    // Arrange: config is disabled
    const disabledConfig = { ...mockConfig, enabled: false };

    // Act
    const result = await executeSyncLogic(disabledConfig);

    // Assert
    expect(result.success).toBe(false);
    // initializeForSync SHOULD NOT be called if sync is disabled
    expect(initializeForSync).not.toHaveBeenCalled();
  });

  it('proceeds to initialization if config.enabled is true', async () => {
    // Arrange: config is enabled
    const enabledConfig = { ...mockConfig, enabled: true };

    // Act
    const result = await executeSyncLogic(enabledConfig);

    // Assert
    expect(result.success).toBe(true);
    expect(initializeForSync).toHaveBeenCalled();
  });

  it('returns failure if initialization fails', async () => {
    // Arrange
    const enabledConfig = { ...mockConfig, enabled: true };
    (initializeForSync as any).mockResolvedValue({ success: false, error: 'auth_failed' });

    // Act
    const result = await executeSyncLogic(enabledConfig);

    // Assert
    expect(result.success).toBe(false);
    expect(initializeForSync).toHaveBeenCalled();
    expect(SyncService.executeFullSync).not.toHaveBeenCalled();
  });

  it('skips sync when wifiOnly is enabled and connection is cellular', async () => {
    const wifiOnlyConfig = { ...mockConfig, wifiOnly: true };
    (getConnectionType as any).mockResolvedValue('cellular');

    const result = await executeSyncLogic(wifiOnlyConfig);

    expect(result.success).toBe(true);
    expect(result.hasNewData).toBe(false);
    expect(result.hasQueueProcessed).toBe(false);
    expect(initializeForSync).not.toHaveBeenCalled();
    expect(SyncService.executeFullSync).not.toHaveBeenCalled();
  });
});
