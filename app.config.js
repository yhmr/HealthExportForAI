import 'dotenv/config';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

export default ({ config }) => {
  const slug = process.env.EXPO_PUBLIC_SLUG;
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const webClientId = process.env.EXPO_PUBLIC_WEB_CLIENT_ID;
  const bundleIdentifier = process.env.EXPO_PUBLIC_BUNDLE_IDENTIFIER;

  if (!slug || !projectId || !webClientId || !bundleIdentifier) {
    console.error('\n\x1b[31m[Error] 必須の環境変数が設定されていません。\x1b[0m');
    if (!slug) console.error('\x1b[33m- EXPO_PUBLIC_SLUG\x1b[0m');
    if (!projectId) console.error('\x1b[33m- EXPO_PUBLIC_EAS_PROJECT_ID\x1b[0m');
    if (!webClientId) console.error('\x1b[33m- EXPO_PUBLIC_WEB_CLIENT_ID\x1b[0m');
    if (!bundleIdentifier) console.error('\x1b[33m- EXPO_PUBLIC_BUNDLE_IDENTIFIER\x1b[0m');
    console.error('\n.env ファイルを作成し、これらの値を設定してください。');
    console.error('.env.example を参考にしてください。\n');
    throw new Error('Missing required environment variables.');
  }

  const isSentryEnabled = !!process.env.EXPO_PUBLIC_SENTRY_DSN;

  const plugins = config.plugins || [];

  // Google Sign-In設定 (iOS用)
  // EXPO_PUBLIC_IOS_URL_SCHEME が設定されている場合、プラグイン設定に注入する
  const iosUrlScheme = process.env.EXPO_PUBLIC_IOS_URL_SCHEME;
  if (iosUrlScheme) {
    const googleSigninPluginIndex = plugins.findIndex(
      (p) =>
        p === '@react-native-google-signin/google-signin' ||
        (Array.isArray(p) && p[0] === '@react-native-google-signin/google-signin')
    );

    if (googleSigninPluginIndex !== -1) {
      const existingConfig = Array.isArray(plugins[googleSigninPluginIndex])
        ? plugins[googleSigninPluginIndex][1]
        : {};
      plugins[googleSigninPluginIndex] = [
        '@react-native-google-signin/google-signin',
        { ...existingConfig, iosUrlScheme }
      ];
    }
  }

  // Sentryプラグインの設定
  if (isSentryEnabled) {
    // 既存のSentryプラグイン設定を上書き、または追加
    const sentryPluginIndex = plugins.findIndex(
      (p) => Array.isArray(p) && p[0] === '@sentry/react-native/expo'
    );

    const sentryConfig = {
      url: 'https://sentry.io/',
      project: process.env.SENTRY_PROJECT || '',
      organization: process.env.SENTRY_ORG || ''
    };

    if (sentryPluginIndex !== -1) {
      plugins[sentryPluginIndex] = ['@sentry/react-native/expo', sentryConfig];
    } else {
      plugins.push(['@sentry/react-native/expo', sentryConfig]);
    }
  } else {
    // Sentryが無効な場合はプラグインを削除
    const sentryPluginIndex = plugins.findIndex(
      (p) =>
        (Array.isArray(p) && p[0] === '@sentry/react-native/expo') ||
        p === '@sentry/react-native/expo'
    );
    if (sentryPluginIndex !== -1) {
      plugins.splice(sentryPluginIndex, 1);
    }
  }

  return {
    ...config,
    version: pkg.version,
    slug: slug,
    plugins: plugins,
    extra: {
      ...config.extra,
      eas: {
        ...config.extra?.eas,
        projectId: projectId
      }
    },
    android: {
      ...config.android,
      package: bundleIdentifier
    },
    ios: {
      ...config.ios,
      bundleIdentifier: bundleIdentifier
    }
  };
};
