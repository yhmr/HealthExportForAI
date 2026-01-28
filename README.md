<div align="center">
  <img src="assets/icon.png" width="120" alt="Health Export For AI Logo" />
  <h1>Health Export For AI</h1>
  <p>
    <strong>Health Connect データを AI 分析のためにエクスポート</strong>
  </p>
  <p>
    <a href="./README_en.md">英語 (English)</a>
  </p>
  <p>
    <a href="https://yhmr.github.io/HealthExportForAI/">公式サイト (Official Site)</a>
  </p>
</div>

<div align="center">

![License](https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square)
![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6?style=flat-square)
![Expo](https://img.shields.io/badge/Expo-SDK%2052-000020?style=flat-square)
![Android](https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square)

</div>

React Native + Expo で構築された Android 専用アプリケーション。Health Connect からヘルスデータを読み取り、柔軟な形式（Google Sheets, PDF, CSV, JSON）で Google Drive にエクスポートして NotebookLM 等の AI ツールで分析できるようにします。

## 特徴

- 🏃 **Health Connect 集約**: 歩数、心拍数、睡眠などのバイタルデータを一元的に取得
- 📂 **クラウド同期**: 指定した Google Drive フォルダへバックアップ
- 📄 **マルチフォーマット**: AI分析に適した CSV/JSON や、可読性の高い PDF/Sheets に対応
- 🤖 **AI Ready**: LLM (NotebookLM等) に食わせやすいデータ構造で出力
- 📱 **ウィジェット**: ホーム画面から同期を実行、同期状態を確認できるウィジェット (1x1, 2x1)
- 🔋 **バックグラウンド実行（Experimental）**: 定期的な自動同期をサポート

## 技術スタック

- **Framework**: React Native, Expo (SDK 52+)
- **Language**: TypeScript
- **State Management**: Zustand
- **Testing**: Vitest
- **Error Monitoring**: Sentry
- **CI**: GitHub Actions

## 必要要件

- Node.js 18 以上
- Android 9 (API 28) 以上
  - 推奨: Android 14 (API 34) 以上（Health Connect が標準搭載のため）
- Health Connect アプリ（Android 13以下の場合）

## セットアップ

### 1. プロジェクトの準備

```bash
# 依存関係をインストール
npm install

# Android ビルド用に prebuild (Native Moduleを含むため必須)
npx expo prebuild --platform android
```

### 2. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、Google Cloud Console で取得した **Web Client ID** を設定します。

```env
EXPO_PUBLIC_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

### 3. アプリの起動

```bash
# 開発サーバーを起動
npm run android
```

## Google Drive API 設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. Google Drive API を有効化
3. OAuth 2.0 クライアント ID (Web application) を作成
4. 取得したクライアント ID を `.env` に設定

## 開発コマンド

```bash
# テストを実行 (Vitest)
npm run test

# テストを一度だけ実行
npm run test:run

# Linter (ESLint) を実行
npm run lint

# Formatter (Prettier) を実行
npm run format
```

## プロジェクト構成

```
├── app/                    # Expo Router ページ
├── src/
│   ├── components/         # UI コンポーネント
│   ├── hooks/              # カスタムフック (useOfflineSync, useDriveAuth など)
│   ├── stores/             # Zustand ストア (Settings, Sync利用)
│   ├── services/           # ビジネスロジック (HealthConnect, Drive, Export, BackgroundSync)
│   ├── i18n/               # 多言語定義
│   ├── types/              # 型定義
│   ├── utils/              # ユーティリティ
│   └── config/             # 設定
├── __tests__/              # Vitest テスト
└── app.json                # Expo 設定
```

## ライセンス

GNU General Public License v3.0 (GPL-3.0)
