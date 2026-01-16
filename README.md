# Connect Health Connect

React Native + Expo で構築された Android 専用アプリケーション。Health Connect からヘルスデータを読み取り、JSON 形式で Google Drive にエクスポートして NotebookLM で分析できるようにします。

## 機能

- **Health Connect 連携**: 8種類のヘルスデータを読み取り
  - 歩数、体重、体脂肪、消費カロリー、基礎代謝、睡眠、運動、栄養
- **データ表示**: シンプルなダッシュボードで最新の健康データを確認
- **Google Drive エクスポート**: JSON 形式でデータをクラウドに保存

## 必要要件

- Node.js 18 以上
- Android 14 以上（API 34+）
- Health Connect アプリがインストールされた端末（またはエミュレータ）

## セットアップ

```bash
# 依存関係をインストール
npm install

# Android ビルド用に prebuild
npx expo prebuild --platform android

# 開発サーバーを起動
npm run android
```

## Google Drive API 設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. Google Drive API を有効化
3. OAuth 2.0 クライアント ID を作成
4. [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) でトークンを取得
5. アプリの設定画面でアクセストークンとフォルダ ID を入力

## 開発

```bash
# テストを実行
npm run test

# テストを一度だけ実行
npm run test:run
```

## プロジェクト構成

```
├── app/                    # Expo Router ページ
├── src/
│   ├── components/         # UI コンポーネント
│   ├── hooks/              # カスタムフック
│   ├── stores/             # Zustand ストア
│   ├── services/           # ビジネスロジック
│   ├── types/              # 型定義
│   ├── utils/              # ユーティリティ
│   └── config/             # 設定
├── __tests__/              # Vitest テスト
└── app.json                # Expo 設定
```

## 技術スタック

- React Native + Expo SDK 52
- TypeScript
- Zustand（状態管理）
- Vitest（テスト）
- react-native-health-connect
- expo-router

## ライセンス

MIT
