<div align="center">
  <img src="assets/icon.png" width="120" alt="Health Export For AI Logo" />
  <h1>Health Export For AI</h1>
  <p>
    <strong>Health Connect データを AI 分析のためにエクスポート</strong>
  </p>
  <p>
    <a href="./README_en.md">英語 (English)</a> | 
    <a href="https://yhmr.github.io/HealthExportForAI/">公式サイト (Official Site)</a> | 
    <a href="https://yhmr.github.io/HealthExportForAI/privacy/">プライバシーポリシー (Privacy Policy)</a>
  </p>
</div>

<div align="center">

![License](https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square)
![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6?style=flat-square)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat-square)
![Android](https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square)

</div>

# Health Export For AI

**Health Export For AI** は、スマホの健康データ（Google Health Connect および Apple Health）を収集し、AIツール（NotebookLMなど）で分析しやすい形式（CSV, JSON）に変換してGoogle Driveに自動同期するアプリケーションです。

## 特徴

- **クロスプラットフォーム対応**: Android (Google Health Connect) と iOS (Apple HealthKit) の両方をサポート
- **自動バックグラウンド同期**: 定期的にヘルスデータを取得し、クラウドへアップロード
- **AIフレンドリーな出力**: LLMが理解しやすい構造化データ (CSV/JSON/PDF) を生成
- **プライバシーファースト**: データはユーザー自身のGoogle Driveにのみ保存され、外部サーバーを経由しません
- **ホーム画面ウィジェット**: 同期ステータスを一目で確認（Androidのみ）

## 対応プラットフォーム

- **Android**: Android 9.0 (API Level 28) 以上、Health Connectアプリ導入済み
- **iOS**: iOS 15.0 以上、ヘルスケアアプリ対応機種

## 技術スタック

- **Framework**: React Native, Expo (SDK 54+)
- **Language**: TypeScript (Strict Mode)
- **State Management**: Zustand
- **Testing**: Vitest (Unit/Integration)
- **Error Monitoring**: Sentry
- **CI**: GitHub Actions

## 必要要件

- Node.js 18+
- Android 9 (API 28)+
  - 推奨: Android 14+ (Health Connect 内蔵)
- iOS 15.1+ (iOS開発の場合)
  - 必須: macOS, Xcode
- Google Cloud Console プロジェクト (Google Drive API 有効化済み)

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下の変数を設定します。

```env
# Google Cloud Console で取得した Web Client ID (必須)
EXPO_PUBLIC_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com

# iOS Client ID (iOS開発の場合必須)
EXPO_PUBLIC_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com

# iOS URL Scheme (iOS開発の場合必須)
# Client IDの逆転形式 (例: com.googleusercontent.apps.CLIENT_ID)
EXPO_PUBLIC_IOS_URL_SCHEME=your-ios-url-scheme

# Expo / EAS 設定 (必須)
EXPO_PUBLIC_SLUG=your-slug
EXPO_PUBLIC_EAS_PROJECT_ID=your-project-id

# App Bundle Identifier / Package Name (必須)
EXPO_PUBLIC_BUNDLE_IDENTIFIER=your.bundle.identifier

# Sentry エラーモニタリング (任意)
# 設定しない場合は Sentry は無効化されます
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Sentry ビルド時設定 (Sentry を使用する場合のみ)
SENTRY_AUTH_TOKEN=your-sentry-token
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-name
```

### 3. 開発サーバーの起動

```bash
# Android
npx expo prebuild --platform android
npm run android

# iOS
npx expo prebuild --platform ios
npm run ios
```

## ビルド手順

ビルドスクリプトを使用して、ローカル環境でビルドが可能です。
ビルドを実行する前に、上記の「環境変数の設定」が完了していることを確認してください。

### コマンド

```bash
# 全工程ビルド (prebuild + gradle build)
npm run build:android:all

# 特定のモードでビルド
npm run build:android:debug   # APK 生成
npm run build:android:release # AAB 生成
```

### Expo / EAS に関する注意点

クローンして自身の環境でビルドする場合、以下の点に注意してください。

1. **プロジェクトIDの更新**: `.env` の `EXPO_PUBLIC_EAS_PROJECT_ID` を自身のプロジェクトIDに書き換えてください。
2. **Slug の変更**: `.env` の `EXPO_PUBLIC_SLUG` を自身のプロジェクト名に変更してください。
3. **Bundle ID の変更**: `.env` の `EXPO_PUBLIC_BUNDLE_IDENTIFIER` を自身のアプリのバンドルID/パッケージ名に変更してください。

## プロジェクト構造

```
├── app/                    # Expo Router ページ
├── src/
│   ├── components/         # UI コンポーネント
│   ├── contexts/           # React Contexts (Language, Theme など)
│   ├── hooks/              # カスタムフック (Business UI Logic)
│   ├── services/           # コアロジック (Internal/External Services)
│   ├── stores/             # Zustand ストア (Global State)
│   ├── types/              # TypeScript 型定義
│   ├── theme/              # テーマ・カラー定義
│   ├── widgets/            # Android Native ウィジェット
│   └── i18n/               # 多言語翻訳データ
├── __tests__/              # Vitest によるテストコード
└── scripts/                # ビルド・メンテナス用スクリプト
```

## 開発ガイドライン

- **型安全**: `Result<T, E>` 型を用いた堅牢なエラーハンドリング。
- **テスト**: 重要なサービスロジックには必ずテストを追加してください。
- **Lint/Format**: `npm run lint:fix` および `npm run format` を活用してください。

## ライセンス

GNU General Public License v3.0 (GPL-3.0)
