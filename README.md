# Health Export For AI

[English](./README_en.md)

React Native + Expo で構築された Android 専用アプリケーション。Health Connect からヘルスデータを読み取り、柔軟な形式（Google Sheets, PDF, CSV, JSON）で Google Drive にエクスポートして NotebookLM 等の AI ツールで分析できるようにします。

## 機能

- **多彩なエクスポート形式**:
  - **Google Sheets**: 分析に最適なスプレッドシート形式
  - **PDF**: 共有や閲覧に適したドキュメント形式
  - **CSV**: 他のデータ分析ツールとの連携に
  - **JSON**: AI への入力に最適化された構造化データ
- **Health Connect 連携**: 8種類のヘルスデータを読み取り
  - 歩数、体重、体脂肪、消費カロリー、基礎代謝、睡眠、運動、栄養
- **バックグラウンド同期**: アプリを閉じていても定期的にデータを自動エクスポート
- **オフラインサポート**: ネットワーク接続がない場合は待機し、接続復帰時に自動で同期
- **多言語対応**: 日本語と英語に対応（端末の言語設定に自動追従）
- **データ表示**: シンプルなダッシュボードで最新の健康データを確認
- **Google Drive エクスポート**: ワンタップでクラウドにバックアップ

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
