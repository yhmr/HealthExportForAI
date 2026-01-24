// 翻訳データ
// 日本語と英語の翻訳を定義

export type Language = 'ja' | 'en';

export const translations = {
  ja: {
    // 共通
    common: {
      back: '戻る',
      cancel: 'キャンセル',
      ok: 'OK',
      error: 'エラー',
      success: '成功'
    },
    // ホーム画面
    home: {
      title: 'Health Export For AI',
      syncButton: 'データを取得',
      lastSync: '最終取得:',
      emptyState1: '「データを取得」ボタンを押して',
      emptyState2: 'Health Connectからデータを取得してください',
      exportButton: 'エクスポート',
      exportSuccess: 'データをエクスポートしました',
      uploadError: 'アップロードエラー'
    },
    // 設定画面
    settings: {
      title: '設定',
      // Googleアカウント
      sectionAccount: 'Googleアカウント',
      signIn: 'Googleでサインイン',
      signOut: 'サインアウト',
      authError: '認証エラー',
      // Google Drive
      sectionDrive: 'Google Drive',
      folderLabel: '保存先フォルダ',
      changeFolder: '保存先を変更',
      // エクスポート形式
      sectionExport: 'エクスポート形式',
      exportHint: '複数の形式を選択できます',
      formatSheets: 'Google Sheets',
      formatSheetsDesc: 'Googleスプレッドシートに出力',
      formatPdf: 'PDF',
      formatPdfDesc: 'SheetsをPDFとしてもエクスポート',
      formatCsv: 'CSV',
      formatCsvDesc: 'カンマ区切りファイル（他ツール連携）',
      formatJson: 'JSON',
      formatJsonDesc: '構造化データ（AI連携向け）',
      // 表示設定
      sectionDisplay: '表示設定',
      theme: 'テーマ',
      themeLight: 'ライト',
      themeDark: 'ダーク',
      themeSystem: 'システム',
      // アプリ情報
      sectionAppInfo: 'アプリ情報',
      about: 'About App',
      licenses: 'サードパーティライセンス',
      // ホームステータス
      statusReady: '準備完了',
      statusSetupRequired: '設定が必要です',
      // 言語
      sectionLanguage: '言語',
      languageJa: '日本語',
      languageEn: 'English',
      // 警告
      warningTitle: '警告',
      noFormatSelected:
        'エクスポート形式が選択されていません。少なくとも1つの形式を選択してください。',
      goBackAnyway: 'このまま戻る',
      permissionRequired: '権限が必要です',
      notificationPermissionDesc: 'バックグラウンド同期を実行するには通知の権限が必要です。'
    },
    // データタグ
    dataTagList: {
      title: 'エクスポートするデータを選択'
    },
    dataTypes: {
      steps: '歩数',
      weight: '体重',
      bodyFat: '体脂肪率',
      totalCaloriesBurned: '消費カロリー',
      basalMetabolicRate: '基礎代謝',
      sleep: '睡眠',
      exercise: '運動',
      nutrition: '栄養'
    },
    // 期間選択
    periodPicker: {
      label: '取得期間',
      days: '日間',
      year: '年間',
      custom: 'カスタム',
      placeholder: '日数',
      selectPeriod: '取得期間を選択'
    },
    // ネットワーク状態
    network: {
      offline: 'オフライン',
      offlineWithCount: 'オフライン（{{count}}件の未同期データ）',
      syncing: '同期中...',
      syncComplete: '同期完了',
      syncError: '同期エラー',
      pendingItems: '{{count}}件の未同期データ'
    },
    // 自動同期設定
    autoSync: {
      sectionTitle: '自動同期',
      enabled: '自動同期',
      enabledDesc: 'バックグラウンドで定期的に同期',
      interval: '同期間隔',
      wifiOnly: 'Wi-Fi接続時のみ',
      wifiOnlyDesc: 'モバイルデータ通信時は同期しない',
      lastSync: '最終バックグラウンド同期',
      never: '未実行',
      nextSync: '次回同期予定'
    },
    // 通知
    notification: {
      syncTitle: '同期中...',
      syncBody: 'ヘルスケアデータをクラウドに保存しています',
      syncSuccess: '同期完了',
      syncSuccessBody: 'データのバックアップが完了しました',
      syncError: '同期エラー',
      syncErrorBody: '同期中にエラーが発生しました'
    },
    // オンボーディング
    onboarding: {
      welcomeTitle: 'Health Export For AIへようこそ',
      welcomeDesc:
        'Health ConnectのデータをGoogle Driveに自動エクスポート。\n数ステップでセットアップしましょう。',
      getStarted: 'はじめる',
      signInTitle: 'サインイン',
      signInDesc: 'Googleアカウントと連携してバックアップを有効にします。',
      signInButton: 'Googleでサインイン',
      signedInAs: 'サインイン中: {{email}}',
      healthTitle: 'Health Connect',
      healthDesc: 'データ読み取り権限を許可してください。',
      grantPermissions: '権限を許可',
      permissionsGranted: '権限許可済み',
      folderTitle: '保存先フォルダ',
      folderDesc: 'Google Drive内の保存先を選択してください。',
      currentFolder: '現在のフォルダ:',
      changeFolder: 'フォルダを変更',
      completedTitle: '準備完了！',
      completedDesc: 'ヘルスケアデータのエクスポートを開始できます。',
      goToDashboard: 'ダッシュボードへ',
      next: '次へ',
      authRequired: 'Google Driveへファイルを保存するため、Googleアカウント連携が必須です。',
      permissionRequired: 'データの取得にはHealth Connectの権限が必須です。',
      exitApp: 'アプリを終了'
    }
  },
  en: {
    // Common
    common: {
      back: 'Back',
      cancel: 'Cancel',
      ok: 'OK',
      error: 'Error',
      success: 'Success'
    },
    // Home screen
    home: {
      title: 'Health Export For AI',
      syncButton: 'Fetch Data',
      lastSync: 'Last sync:',
      emptyState1: 'Press "Fetch Data" to',
      emptyState2: 'retrieve data from Health Connect',
      exportButton: 'Export',
      exportSuccess: 'Data exported successfully',
      uploadError: 'Upload Error'
    },
    // Settings screen
    settings: {
      title: 'Settings',
      // Google Account
      sectionAccount: 'Google Account',
      signIn: 'Sign in with Google',
      signOut: 'Sign Out',
      authError: 'Authentication Error',
      // Google Drive
      sectionDrive: 'Google Drive',
      folderLabel: 'Destination Folder',
      changeFolder: 'Change Folder',
      // Export format
      sectionExport: 'Export Format',
      exportHint: 'You can select multiple formats',
      formatSheets: 'Google Sheets',
      formatSheetsDesc: 'Export to Google Spreadsheet',
      formatPdf: 'PDF',
      formatPdfDesc: 'Also export Sheets as PDF',
      formatCsv: 'CSV',
      formatCsvDesc: 'Comma-separated file (for other tools)',
      formatJson: 'JSON',
      formatJsonDesc: 'Structured data (for AI integration)',
      // Display Settings
      sectionDisplay: 'Display',
      theme: 'Theme',
      themeLight: 'Light',
      themeDark: 'Dark',
      themeSystem: 'System',
      // App info
      sectionAppInfo: 'App Info',
      about: 'About App',
      licenses: 'Third-party Licenses',
      // Language
      sectionLanguage: 'Language',
      languageJa: '日本語',
      languageEn: 'English',
      // Warning
      warningTitle: 'Warning',
      noFormatSelected: 'No export format selected. Please select at least one format.',
      goBackAnyway: 'Go Back Anyway',
      permissionRequired: 'Permission Required',
      notificationPermissionDesc: 'Notification permission is required to run background sync.'
    },
    // Data tag list
    dataTagList: {
      title: 'Select data to export'
    },
    dataTypes: {
      steps: 'Steps',
      weight: 'Weight',
      bodyFat: 'Body Fat',
      totalCaloriesBurned: 'Calories Burned',
      basalMetabolicRate: 'BMR',
      sleep: 'Sleep',
      exercise: 'Exercise',
      nutrition: 'Nutrition'
    },
    // Period picker
    periodPicker: {
      label: 'Period',
      days: 'days',
      year: 'year',
      custom: 'Custom',
      placeholder: 'Days',
      selectPeriod: 'Select Period'
    },
    // Network status
    network: {
      offline: 'Offline',
      offlineWithCount: 'Offline ({{count}} pending items)',
      syncing: 'Syncing...',
      syncComplete: 'Sync complete',
      syncError: 'Sync error',
      pendingItems: '{{count}} pending items'
    },
    // Auto sync settings
    autoSync: {
      sectionTitle: 'Auto Sync',
      enabled: 'Auto Sync',
      enabledDesc: 'Sync periodically in background',
      interval: 'Sync Interval',
      wifiOnly: 'Wi-Fi Only',
      wifiOnlyDesc: 'Do not sync on mobile data',
      lastSync: 'Last Background Sync',
      never: 'Never',
      nextSync: 'Next Sync'
    },
    // Notifications
    notification: {
      syncTitle: 'Syncing...',
      syncBody: 'Uploading health data to cloud',
      syncSuccess: 'Sync Complete',
      syncSuccessBody: 'Data backup completed',
      syncError: 'Sync Error',
      syncErrorBody: 'An error occurred during sync'
    },
    // Onboarding
    onboarding: {
      welcomeTitle: 'Welcome to Health Export',
      welcomeDesc:
        "Export your Health Connect data to Google Drive automatically.\nLet's get you set up in a few simple steps.",
      getStarted: 'Get Started',
      signInTitle: 'Sign In',
      signInDesc: 'Connect your Google account to enable Drive backups.',
      signInButton: 'Sign In with Google',
      signedInAs: 'Signed in as {{email}}',
      healthTitle: 'Health Connect',
      healthDesc: 'Allow access to read your health data for export.',
      grantPermissions: 'Grant Permissions',
      permissionsGranted: 'Permissions granted',
      folderTitle: 'Destination Folder',
      folderDesc: 'Choose where to save your health data in Google Drive.',
      currentFolder: 'Current Folder:',
      changeFolder: 'Change Folder',
      completedTitle: 'All Set!',
      completedDesc: 'You are ready to start exporting your health data.',
      goToDashboard: 'Go to Dashboard',
      next: 'Next',
      authRequired: 'Linking your Google account is required to save files to Google Drive.',
      permissionRequired: 'Health Connect permissions are required to retrieve data.',
      exitApp: 'Exit App'
    }
  }
} as const;

// 翻訳キーの型
export type TranslationKeys = typeof translations.ja;
