import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AutoSyncConfig } from '../../../src/types/export';

import {
  BACKGROUND_SYNC_TASK,
  syncBackgroundTask
} from '../../../src/services/background/scheduler';

const {
  getStatusAsyncMock,
  registerTaskAsyncMock,
  unregisterTaskAsyncMock,
  isTaskRegisteredAsyncMock
} = vi.hoisted(() => ({
  getStatusAsyncMock: vi.fn(),
  registerTaskAsyncMock: vi.fn(),
  unregisterTaskAsyncMock: vi.fn(),
  isTaskRegisteredAsyncMock: vi.fn()
}));

vi.mock('expo-background-fetch', () => ({
  BackgroundFetchStatus: {
    Available: 1,
    Restricted: 2,
    Denied: 3
  },
  BackgroundFetchResult: {
    NewData: 1,
    NoData: 2,
    Failed: 3
  },
  getStatusAsync: getStatusAsyncMock,
  registerTaskAsync: registerTaskAsyncMock,
  unregisterTaskAsync: unregisterTaskAsyncMock
}));

vi.mock('expo-task-manager', () => ({
  defineTask: vi.fn(),
  isTaskRegisteredAsync: isTaskRegisteredAsyncMock
}));

vi.mock('@notifee/react-native', () => ({
  default: {
    createChannel: vi.fn(),
    displayNotification: vi.fn()
  },
  AndroidImportance: {
    DEFAULT: 3
  }
}));

vi.mock('../../../src/services/debugLogService', () => ({
  addDebugLog: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../../src/services/config/BackgroundSyncConfigService', () => ({
  backgroundSyncConfigService: {
    loadBackgroundSyncConfig: vi.fn().mockResolvedValue({
      enabled: true,
      intervalMinutes: 60,
      wifiOnly: true
    })
  }
}));

vi.mock('../../../src/services/infrastructure/keyValueStorage', () => ({
  keyValueStorage: {
    getItem: vi.fn().mockResolvedValue('ja')
  }
}));

vi.mock('../../../src/services/background/backgroundTask', () => ({
  executeSyncLogic: vi.fn()
}));

describe('scheduler', () => {
  const enabledConfig: AutoSyncConfig = {
    enabled: true,
    intervalMinutes: 60,
    wifiOnly: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getStatusAsyncMock.mockResolvedValue(1);
    registerTaskAsyncMock.mockResolvedValue(undefined);
    unregisterTaskAsyncMock.mockResolvedValue(undefined);
    isTaskRegisteredAsyncMock.mockResolvedValue(false);
  });

  it('returns false when background fetch is denied and avoids registration', async () => {
    getStatusAsyncMock.mockResolvedValue(3);

    const applied = await syncBackgroundTask(enabledConfig);

    expect(applied).toBe(false);
    expect(registerTaskAsyncMock).not.toHaveBeenCalled();
  });

  it('registers task and returns true when auto sync is enabled', async () => {
    const applied = await syncBackgroundTask(enabledConfig);

    expect(applied).toBe(true);
    expect(registerTaskAsyncMock).toHaveBeenCalledWith(BACKGROUND_SYNC_TASK, {
      minimumInterval: 60 * 60
    });
  });

  it('re-registers task and returns true when task is already registered', async () => {
    isTaskRegisteredAsyncMock.mockResolvedValue(true);

    const applied = await syncBackgroundTask(enabledConfig);

    expect(applied).toBe(true);
    expect(unregisterTaskAsyncMock).toHaveBeenCalledWith(BACKGROUND_SYNC_TASK);
    expect(registerTaskAsyncMock).toHaveBeenCalledWith(BACKGROUND_SYNC_TASK, {
      minimumInterval: 60 * 60
    });
  });
});
