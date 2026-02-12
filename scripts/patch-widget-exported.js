#!/usr/bin/env node
/**
 * react-native-android-widget の Expo プラグインにおける
 * ウィジェット receiver の android:exported="false" を "true" に修正するパッチ。
 *
 * AppWidgetProvider はシステム（ランチャー）からのブロードキャスト受信のため
 * exported="true" が必須。ライブラリ側でハードコードされている値を修正する。
 */
/* eslint-env node */
const fs = require('fs');
const path = require('path');

const pluginPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-android-widget',
  'app.plugin.js'
);

if (!fs.existsSync(pluginPath)) {
  console.log('[patch-widget-exported] app.plugin.js not found, skipping.');
  process.exit(0);
}

let content = fs.readFileSync(pluginPath, 'utf-8');

// 'android:exported': 'false' を 'android:exported': 'true' に書き換え
// withWidgetReceiver 関数内の receiver 定義にのみ影響
const target = "'android:exported': 'false'";
const replacement = "'android:exported': 'true'";

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(pluginPath, content);
  console.log('[patch-widget-exported] Patched app.plugin.js: exported set to true');
} else if (content.includes(replacement)) {
  console.log('[patch-widget-exported] Already patched.');
} else {
  console.warn('[patch-widget-exported] Target string not found in app.plugin.js');
}
