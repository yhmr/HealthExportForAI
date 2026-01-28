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
  getGrantedPermissions: vi.fn(),
  getSdkStatus: vi.fn(),
  aggregateGroupByDuration: vi.fn(),
  SdkAvailabilityStatus: { SDK_AVAILABLE: 1, SDK_UNAVAILABLE: 2 },
  ExerciseType: {}
}));

// Mock React Native Core
vi.mock('react-native', () => ({
  PermissionsAndroid: {
    check: vi.fn(() => Promise.resolve(true)),
    request: vi.fn(() => Promise.resolve('granted')),
    RESULTS: { GRANTED: 'granted' }
  },
  Platform: {
    OS: 'android',
    Version: 34,
    select: (objs: any) => objs.android
  }
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
