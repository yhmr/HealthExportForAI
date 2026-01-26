---
title: 'User Guide'
date: 2026-01-25T21:00:00+09:00
draft: false
layout: 'page'
---

# User Guide

This guide explains how to export your Google Health Connect data using **Health Export For AI**.

## 1. Initial Setup

### Install Health Connect

This app uses Health Connect.
On Android 14 and later, it is pre-installed. For older versions, please install it from the Play Store.

### Grant Permissions

When you first launch the app, you will be asked to grant access to Health Connect and Google Drive (Sign-in). Please allow both.

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/init-01.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/init-02.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/init-03.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/init-04.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/init-05.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

- **Google Sign-In:** Required to upload exported files to Google Drive.
- **Health Connect Permissions:** Required to read data such as steps, weight, sleep, etc.

## 2. Sync Data (Manual)

1.  Select the date range for the data you want to export.
2.  Tap "Fetch Data" to retrieve data from Health Connect for the specified days.

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/home-01.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/home-02.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/home-03.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/home-04.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

3.  Tap "Export" to upload the data to your configured Google Drive.
4.  Once synchronized, a folder named `HealthExport` (or your custom folder) will be created in your Google Drive root directory containing the saved data.

## 3. Sync with Widget

Add the widget to your home screen for one-tap synchronization.

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/widget-01.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/widget-02.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

1.  Long-press on the Android home screen and select "Widgets".
2.  Find **Health Export For AI** and place the widget.
3.  Tap the widget to start the background sync process.

## 4. Export Settings

You can change the export format from the settings screen (gear icon).

<img src="/HealthExportForAI/img/setting-01.png" width="200" />

- **Google Sheets:** Save as spreadsheets (Ideal for AI analysis)
- **PDF:** Save as PDF file
- **JSON / CSV:** Save as raw data

---

If you have any questions, please contact us via [GitHub Issue](https://github.com/yhmr/HealthExportForAI/issues).
