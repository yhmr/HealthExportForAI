import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueueManager } from '../../../src/services/export/QueueManager';
import type { HealthData } from '../../../src/types/health';

const { getItemMock, setItemMock, removeItemMock, addDebugLogMock } = vi.hoisted(() => ({
  getItemMock: vi.fn(),
  setItemMock: vi.fn(),
  removeItemMock: vi.fn(),
  addDebugLogMock: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../../src/services/infrastructure/keyValueStorage', () => ({
  keyValueStorage: {
    getItem: getItemMock,
    setItem: setItemMock,
    removeItem: removeItemMock
  }
}));

vi.mock('../../../src/services/debugLogService', () => ({
  addDebugLog: addDebugLogMock
}));

const emptyHealthData: HealthData = {
  steps: [],
  weight: [],
  bodyFat: [],
  totalCaloriesBurned: [],
  basalMetabolicRate: [],
  sleep: [],
  exercise: [],
  nutrition: []
};

describe('QueueManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reset queue when stored JSON is invalid', async () => {
    getItemMock.mockResolvedValueOnce('{invalid');
    const manager = new QueueManager();

    const queue = await manager.getQueue();

    expect(queue).toEqual([]);
    expect(addDebugLogMock).toHaveBeenCalledWith(
      '[QueueManager] Invalid JSON format, resetting queue',
      'warn'
    );
  });

  it('should sanitize queue and keep only valid entries', async () => {
    const validEntry = {
      id: 'valid-1',
      createdAt: new Date().toISOString(),
      healthData: emptyHealthData,
      selectedTags: ['steps'],
      syncDateRange: null,
      retryCount: 1
    };
    const invalidEntry = {
      createdAt: new Date().toISOString(),
      healthData: emptyHealthData
    };

    getItemMock.mockResolvedValueOnce(
      JSON.stringify({
        pending: [validEntry, invalidEntry],
        updatedAt: new Date().toISOString()
      })
    );

    const manager = new QueueManager();
    const queue = await manager.getQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe('valid-1');
    expect(queue[0].selectedTags).toEqual(['steps']);
  });

  it('should reset queue when stored shape is invalid', async () => {
    getItemMock.mockResolvedValueOnce(JSON.stringify({ pending: 'not-array' }));
    const manager = new QueueManager();

    const queue = await manager.getQueue();

    expect(queue).toEqual([]);
    expect(addDebugLogMock).toHaveBeenCalledWith(
      '[QueueManager] Invalid queue format, resetting queue',
      'warn'
    );
  });
});
