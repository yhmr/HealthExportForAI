---
title: 'プライバシーポリシー'
date: 2026-01-25T21:00:00+09:00
draft: false
layout: 'page'
---

# プライバシーポリシー

**Health Export For AI**（以下、「本アプリ」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。本ポリシーでは、本アプリがどのように情報を収集、使用、共有するかについて説明します。

## 1. 情報の収集と利用

### 健康データの利用 (Health Connect / Apple Health)

本アプリは、ユーザーのデバイスから以下の健康データを取得します。

- **Android:** Google Health Connect API を使用
- **iOS:** Apple HealthKit を使用

- 歩数 (Steps)
- 消費カロリー (Total Calories Burned)
- 体重 (Weight)
- 体脂肪率 (Body Fat)
- 基礎代謝 (Basal Metabolic Rate)
- 睡眠データ (Sleep)
- 運動データ (Exercise)
- 栄養データ (Nutrition)

**利用目的:**
取得したデータは、ユーザーが指定した形式（Google Sheets、CSVなど）で、ユーザー自身のGoogle Driveにエクスポートするためにのみ使用されます。

**データ保護:**

- **本アプリの開発者が、ユーザーの健康データを収集・保存・閲覧することはありません。**
- データ処理はすべてユーザーのデバイス上で行われ、直接ユーザーのGoogle Driveへ送信されます。外部サーバーへの送信は行われません。

### Google Driveへのアクセス

本アプリは、エクスポートファイルを保存するために、Google Driveへのアクセス権（ファイルの作成・編集権限）を要求します。
この権限は、エクスポート機能の提供のみに使用され、ユーザーの既存のファイルを読み取ったり削除したりすることはありません。

## 2. 第三者へのデータ提供

本アプリは、ユーザーの同意がある場合や法令に基づく場合を除き、取得した個人情報を第三者に提供することはありません。
また、健康データを広告目的で使用することはありません。

## 3. プラットフォーム固有のポリシー

### Android (Google Play)

本アプリによる Health Connect からの情報の使用は、[Health Connect Permissions policy](https://support.google.com/googleplay/android-developer/answer/9888170) に準拠します（これには [Limited Use](https://support.google.com/googleplay/android-developer/answer/9888170#limited-use) 要件も含まれます）。

### iOS (App Store)

本アプリは Apple の [HealthKit](https://developer.apple.com/documentation/healthkit) ガイドラインおよびプライバシーポリシーに準拠して健康データを取り扱います。iCloud へのバックアップを除き、健康データを外部へ送信することはありません。

## 4. お問い合わせ

本ポリシーに関するご質問は、以下の連絡先までお問い合わせください。

- **開発者:** yhmr
- **GitHub Issue:** [https://github.com/yhmr/HealthExportForAI/issues](https://github.com/yhmr/HealthExportForAI/issues)

---

_最終更新日: 2026年1月25日_
