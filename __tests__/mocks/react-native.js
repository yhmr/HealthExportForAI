module.exports = {
  Platform: {
    OS: 'android',
    select: (objs) => objs.android,
    Version: 34
  },
  PermissionsAndroid: {
    CHECK: 'check',
    REQUEST: 'request',
    check: () => Promise.resolve(true),
    request: () => Promise.resolve('granted'),
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again'
    }
  },
  Linking: {
    canOpenURL: () => Promise.resolve(false),
    openURL: () => Promise.resolve(),
    openSettings: () => Promise.resolve()
  },
  NativeModules: {},
  DeviceEventEmitter: {
    addListener: () => {},
    emit: () => {}
  }
};
