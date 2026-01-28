// ストレージキー定義
// 全てのAsyncStorageキーを一元管理

export const STORAGE_KEYS = {
  // ユーザー設定
  APP_LANGUAGE: '@app_language',
  APP_THEME: '@app_theme',

  // エクスポート設定
  EXPORT_PERIOD_DAYS: '@export_period_days',
  EXPORT_FORMATS: '@export_formats',
  EXPORT_SHEET_AS_PDF: '@export_sheet_as_pdf',
  SELECTED_DATA_TAGS: '@selected_data_tags',

  // アプリ状態・連携
  IS_SETUP_COMPLETED: '@is_setup_completed',
  DRIVE_CONFIG: '@drive_config',
  LAST_SYNC_TIME: '@last_sync_time', // 統合された同期時刻

  // バックグラウンド同期
  BACKGROUND_SYNC_CONFIG: '@background_sync_config',

  // 内部処理
  OFFLINE_EXPORT_QUEUE: '@offline_export_queue',
  DEBUG_LOG: '@background_sync_debug_log'
} as const;
