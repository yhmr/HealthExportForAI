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
  Linking: {
    canOpenURL: vi.fn(() => Promise.resolve(false)),
    openURL: vi.fn(() => Promise.resolve()),
    openSettings: vi.fn(() => Promise.resolve())
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

// Mock Google Signin
vi.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: vi.fn(),
    hasPlayServices: vi.fn().mockResolvedValue(true),
    signIn: vi.fn().mockResolvedValue({
      user: {
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        photo: null,
        familyName: 'User',
        givenName: 'Test'
      },
      idToken: 'test-id-token'
    }),
    signOut: vi.fn().mockResolvedValue(null),
    isSignedIn: vi.fn().mockResolvedValue(true),
    getTokens: vi.fn().mockResolvedValue({ accessToken: 'test-access-token' })
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE'
  }
}));
