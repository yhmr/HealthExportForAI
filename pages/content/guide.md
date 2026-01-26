---
title: '使い方ガイド'
date: 2026-01-25T21:00:00+09:00
draft: false
layout: 'page'
---

# 使い方ガイド

**Health Export For AI** を使って、Google Health Connectのデータを手軽にエクスポートする方法を説明します。

## 1. 初期設定

### Health Connectのインストール

本アプリは Health Connect (ヘルスコネクト) アプリを利用します。  
Android 14以降は標準搭載されていますが、それ以前のバージョンではPlay Storeからインストールが必要です。

### 権限の許可

アプリを初回起動すると、Health Connectへのアクセス権限と、Google Driveへのアクセス権限（サインイン）が求められます。それぞれ「許可」してください。

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/init-01.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/init-02.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/init-03.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/init-04.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/init-05.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

- **Google Sign-In:** エクスポートしたファイルをGoogle Driveにアップロードするために必要です。
- **Health Connect権限:** 歩数・体重・睡眠などのデータを読み取るために必要です。

## 2. データの同期（手動）

1.  取得するデータの期間を選択します。
2.  「データを取得」をタップすることで、HealthConnectから該当日数分のデータを取得してきます。

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/home-01.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/home-02.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/home-03.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/home-04.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

3.  「エクスポート」をタップし、設定したGoogleドライブにデータをアップロードします。
4.  同期が完了すると、Google Driveのルートフォルダに `HealthExport` というフォルダ（または設定したフォルダ）が作成され、データが保存されます。

## 3. ウィジェットによる同期

ホーム画面にウィジェットを追加すると、ワンタップで同期を実行できます。

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/widget-01.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/widget-02.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

1.  Androidのホーム画面を長押しし、「ウィジェット」を選択します。
2.  **Health Export For AI** を探し、ウィジェットを配置します。
3.  ウィジェットをタップすると、バックグラウンドで同期処理が開始されます。

## 4. エクスポート形式の設定

設定画面（歯車アイコン）から、エクスポート形式を変更できます。

<img src="/HealthExportForAI/img/setting-01.png" width="200" />

- **Google Sheets:** スプレッドシートとして保存（AI分析に最適）
- **JSON / CSV:** 生データとして保存

---

ご不明な点は [GitHub Issue](https://github.com/yhmr/HealthExportForAI/issues) までお寄せください。
