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
![Expo](https://img.shields.io/badge/Expo-SDK%2052-000020?style=flat-square)
![Android](https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square)

</div>

React Native + Expo で構築された Android 専用アプリケーション。Health Connect からヘルスデータを読み取り、柔軟な形式（Google Sheets, PDF, CSV, JSON）で Google Drive にエクスポートして NotebookLM 等の AI ツールで分析できるようにします。

## 主な機能

- **Health Connect 連携**: 歩数、心拍数、睡眠等のバイタルデータを一元取得。
- **Google Drive 同期**: 指定フォルダへの自動/手動バックアップ。
- **柔軟なエクスポート**: AI分析に適した CSV/JSON、可読性の高い PDF/Sheets に対応。
- **ホーム画面ウィジェット**: 同期の実行と状態確認が可能。
- **バックグラウンド同期（Experimental）**: 定期的な自動データ更新をサポート。

## 技術スタック

- **Framework**: React Native, Expo (SDK 52+)
- **Language**: TypeScript (Strict Mode)
- **State Management**: Zustand
- **Testing**: Vitest (Unit/Integration)
- **Error Monitoring**: Sentry
- **CI**: GitHub Actions

## 必要要件

- Node.js 18+
- Android 9 (API 28)+
  - 推奨: Android 14+ (Health Connect 内蔵)
- Google Cloud Console プロジェクト (Google Drive API 有効化済み)

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下の変数を設定します。

```env
# Google Cloud Console で取得した Web Client ID
EXPO_PUBLIC_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com

# Sentry エラーモニタリング (ビルド時に必要)
SENTRY_AUTH_TOKEN=your-sentry-token
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-name
```

### 3. 開発サーバーの起動

```bash
npx expo prebuild --platform android
npm run android
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
