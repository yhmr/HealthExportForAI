---
title: 'User Guide'
date: 2026-01-25T21:00:00+09:00
draft: false
layout: 'page'
---

# User Guide

This guide explains how to easily export your health data using **Health Export For AI**.

> [!NOTE]
> The images in this guide are from the Android version, but the basic operations are the same for the iOS version. On iOS, "Apple Health" is used instead of "Health Connect".

## 1. Initial Setup

### Install Health Connect

This app uses **Health Connect** on Android and **Apple Health** on iOS.

- **Android:** On Android 14 and later, Health Connect is pre-installed. For earlier versions, please install it from the Play Store.
- **iOS:** No additional installation is required.

### Grant Permissions

1. When you first launch the app, you will be asked to grant access to your health data and Google Drive.

- **Android:** The Health Connect permission request screen will appear. Please select "Allow all".
- **iOS:** The Apple Health access permission screen will appear. Please select "Turn All Categories On" and tap "Allow" at the top right.

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/onboard-01.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/onboard-02.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/onboard-03.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

- **Google Sign-In:** Required to upload exported files to Google Drive.
- **Health Data Permissions:** Required to read data such as steps, weight, sleep, etc.

2. Next, complete the initial setup. First, specify the historical range of data to retrieve from Health Connect. Once the retrieval is complete, specify "the types of data to export".

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/onboard-04.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/onboard-05.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/onboard-06.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

3. Continue by specifying the file format for export and the destination folder on Google Drive.

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/onboard-07.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/onboard-08.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

4. You're all set! Now, whenever you want to sync your data, just press the button in the app or tap the widget, and your Google Drive data will be updated!

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/onboard-09.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

## 2. Syncing Data

By tapping "Sync Now", you can retrieve the latest data from Health Connect and save it to Google Drive.  
(After the first sync, only the difference since the last sync will be added.)

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/home-01.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

## 3. Syncing with Widgets (Android Only)

On Android, by adding a widget to your home screen, you can perform synchronization with a single tap.

<div style="display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px;">
<img src="/HealthExportForAI/img/widget-01.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
<img src="/HealthExportForAI/img/widget-02.png" width="200" style="scroll-snap-align: start; flex: 0 0 auto;" />
</div>

1. Long-press on the Android home screen and select "Widgets".
2. Find **Health Export For AI** and place the widget anywhere on your home screen.

(You can also place the widget via the menu shown by long-pressing the app icon.)

3. Tapping the widget will start the synchronization process in the background.

## 4. Changing Settings

You can change various settings, such as the export format, from the settings screen (gear icon).

<img src="/HealthExportForAI/img/setting-01.png" width="200" />

---

If you have any questions, please post them to [GitHub Issue](https://github.com/yhmr/HealthExportForAI/issues).
