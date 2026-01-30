import 'dotenv/config';

export default ({ config }) => {
  const slug = process.env.EXPO_PUBLIC_SLUG;
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const webClientId = process.env.EXPO_PUBLIC_WEB_CLIENT_ID;

  if (!slug || !projectId || !webClientId) {
    console.error('\n\x1b[31m[Error] 必須の環境変数が設定されていません。\x1b[0m');
    if (!slug) console.error('\x1b[33m- EXPO_PUBLIC_SLUG\x1b[0m');
    if (!projectId) console.error('\x1b[33m- EXPO_PUBLIC_EAS_PROJECT_ID\x1b[0m');
    if (!webClientId) console.error('\x1b[33m- EXPO_PUBLIC_WEB_CLIENT_ID\x1b[0m');
    console.error('\n.env ファイルを作成し、これらの値を設定してください。');
    console.error('.env.example を参考にしてください。\n');
    throw new Error('Missing required environment variables.');
  }

  const isSentryEnabled = !!process.env.EXPO_PUBLIC_SENTRY_DSN;

  const plugins = config.plugins || [];

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
    slug: slug,
    plugins: plugins,
    extra: {
      ...config.extra,
      eas: {
        ...config.extra?.eas,
        projectId: projectId
      }
    }
  };
};
