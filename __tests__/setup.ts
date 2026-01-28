import { vi } from 'vitest';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: vi.fn(() => Promise.resolve()),
    getItem: vi.fn(() => Promise.resolve(null)),
    removeItem: vi.fn(() => Promise.resolve()),
    mergeItem: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
    getAllKeys: vi.fn(() => Promise.resolve([])),
    multiGet: vi.fn(() => Promise.resolve([])),
    multiSet: vi.fn(() => Promise.resolve()),
    multiRemove: vi.fn(() => Promise.resolve()),
    multiMerge: vi.fn(() => Promise.resolve())
  }
}));

// Mock React Native Health Connect (if needed globally)
vi.mock('react-native-health-connect', () => ({
  initialize: vi.fn(),
  requestPermission: vi.fn(),
  readRecords: vi.fn(),
  getGrantedPermissions: vi.fn()
}));

// Mock Expo modules if necessary
vi.mock('expo-file-system', () => ({
  documentDirectory: '/tmp/',
  writeAsStringAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
  deleteAsync: vi.fn(),
  getInfoAsync: vi.fn(),
  makeDirectoryAsync: vi.fn()
}));
