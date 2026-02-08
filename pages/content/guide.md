---
title: '使い方ガイド'
date: 2026-01-25T21:00:00+09:00
draft: false
layout: 'page'
---

# 使い方ガイド

**Health Export For AI** を使って、Google ヘルスコネクトのデータを手軽にエクスポートする方法を説明します。

> [!NOTE]
> 本ガイドの画像は Android 版のものですが、iOS 版でも基本的な操作は同じです。iOS 版では "Health Connect" の代わりに "Apple Health (ヘルスケア)" が使用されます。

## 1. 初期設定

### ヘルスコネクトのインストール

本アプリは Android では **Health Connect（ヘルスコネクト）**、iOS では **Apple Health（ヘルスケア）** を利用します。

- **Android:** Android 14 以降では Health Connect が標準搭載されています。以前のバージョンをご利用の場合は Play ストアからのインストールが必要です。
- **iOS:** 特に追加のインストールは不要です。

### 権限の許可

1. アプリを初めて起動すると、健康データへのアクセス権限と、Google ドライブへのアクセス権限（サインイン）が求められます。

- **Android:** Health Connect の権限リクエスト画面が表示されます。「すべて許可」などを選択してください。
- **iOS:** Apple Health のアクセス許可画面が表示されます。「すべてオンにする」を選択し、画面右上の「許可」をタップしてください。

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/onboard-01.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/onboard-02.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/onboard-03.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

- **Google サインイン:** エクスポートしたファイルを Google ドライブにアップロードするために必要です。
- **健康データへのアクセス権限:** 歩数・体重・睡眠などのデータを読み取るために必要です。

2. 続けて初期設定を行います。まずは、ヘルスコネクトから取得するデータの履歴範囲を指定します。データの読み取りが完了したら、次に「どのデータをエクスポートするか」を選択します。

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/onboard-04.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/onboard-05.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/onboard-06.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

3. 続けて、エクスポートするファイル形式と、保存先の Google ドライブフォルダを指定します。

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/onboard-07.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/onboard-08.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

4. これで準備完了です！あとはデータを同期したいときに、アプリ内のボタンやウィジェットをタップするだけで、Google ドライブ上のデータが更新されます。

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/onboard-09.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

## 2. データの同期

「Sync Now」をタップすることで、ヘルスコネクトから最新データを取得し、Google ドライブに保存します。  
（2回目以降は、前回の取得時からの差分データのみが追加されます。）

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/home-01.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

## 3. ウィジェットによる同期 (Androidのみ)

Android 版では、ホーム画面にウィジェットを追加すると、ワンタップで同期を実行できます。

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/widget-01.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/widget-02.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

1. Android のホーム画面を長押しし、「ウィジェット」を選択します。
2. **Health Export For AI** を探し、ホーム画面の好きな場所に配置します。

（アプリアイコンを長押しして表示されるメニューから、ウィジェットを配置することも可能です。）

3. 配置したウィジェットをタップすると、バックグラウンドで同期処理が開始されます。

## 4. 設定の変更

設定画面（歯車アイコン）から、エクスポート形式などの各種設定を変更できます。

<img src="/HealthExportForAI/img/setting-01.png" width="200" />

---

ご不明な点は [GitHub Issue](https://github.com/yhmr/HealthExportForAI/issues) までお寄せください。
