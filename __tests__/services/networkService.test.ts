import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getConnectionType,
  getNetworkStatus,
  subscribeToNetworkChanges
} from '../../src/services/networkService';

const { fetchMock, addEventListenerMock, addDebugLogMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  addEventListenerMock: vi.fn(),
  addDebugLogMock: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: fetchMock,
    addEventListener: addEventListenerMock
  }
}));

vi.mock('../../src/services/debugLogService', () => ({
  addDebugLog: addDebugLogMock
}));

describe('networkService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getNetworkStatus: should map connected states to online/offline/unknown', async () => {
    fetchMock.mockResolvedValueOnce({ isConnected: true, type: 'wifi' });
    await expect(getNetworkStatus()).resolves.toBe('online');

    fetchMock.mockResolvedValueOnce({ isConnected: false, type: 'cellular' });
    await expect(getNetworkStatus()).resolves.toBe('offline');

    fetchMock.mockResolvedValueOnce({ isConnected: null, type: 'unknown' });
    await expect(getNetworkStatus()).resolves.toBe('unknown');
  });

  it('getConnectionType: should map network types correctly', async () => {
    fetchMock.mockResolvedValueOnce({ isConnected: true, type: 'wifi' });
    await expect(getConnectionType()).resolves.toBe('wifi');

    fetchMock.mockResolvedValueOnce({ isConnected: true, type: 'cellular' });
    await expect(getConnectionType()).resolves.toBe('cellular');

    fetchMock.mockResolvedValueOnce({ isConnected: true, type: 'ethernet' });
    await expect(getConnectionType()).resolves.toBe('ethernet');

    fetchMock.mockResolvedValueOnce({ isConnected: true, type: 'bluetooth' });
    await expect(getConnectionType()).resolves.toBe('other');

    fetchMock.mockResolvedValueOnce({ isConnected: false, type: 'wifi' });
    await expect(getConnectionType()).resolves.toBe('offline');

    fetchMock.mockResolvedValueOnce({ isConnected: null, type: 'unknown' });
    await expect(getConnectionType()).resolves.toBe('unknown');
  });

  it('getConnectionType: should return unknown and log when fetch fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('fetch failed'));

    await expect(getConnectionType()).resolves.toBe('unknown');
    expect(addDebugLogMock).toHaveBeenCalledWith(
      '[NetworkService] Failed to get connection type: Error: fetch failed',
      'error'
    );
  });

  it('subscribeToNetworkChanges: should forward mapped status and return unsubscribe', async () => {
    let listener: ((state: { isConnected: boolean | null; type: string }) => Promise<void>) | null =
      null;
    const unsubscribeMock = vi.fn();
    addEventListenerMock.mockImplementation((handler) => {
      listener = handler;
      return unsubscribeMock;
    });

    const callback = vi.fn();
    const unsubscribe = subscribeToNetworkChanges(callback);

    expect(unsubscribe).toBe(unsubscribeMock);
    expect(listener).not.toBeNull();

    await (listener as any)?.({ isConnected: true, type: 'wifi' });

    expect(addDebugLogMock).toHaveBeenCalledWith(
      '[NetworkService] Network status changed: online',
      'info'
    );
    expect(callback).toHaveBeenCalledWith('online');
  });
});
