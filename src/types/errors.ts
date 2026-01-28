/**
 * アプリケーションエラーの基底クラス
 */
export class AppError extends Error {
  constructor(
    public override message: string,
    public code: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    // TypeScriptでのinstanceofチェック用のおまじない（ターゲットがES5以下の場合に必要だが、念のため）
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toString(): string {
    return `[${this.code}] ${this.message}${this.cause ? ` (Caused by: ${String(this.cause)})` : ''}`;
  }
}

/**
 * ネットワークエラー
 */
export class NetworkError extends AppError {
  constructor(message: string, code: string = 'NETWORK_ERROR', cause?: unknown) {
    super(message, code, cause);
    this.name = 'NetworkError';
  }
}

/**
 * ストレージエラー（ファイルシステム、AsyncStorage等）
 */
export class StorageError extends AppError {
  constructor(message: string, code: string = 'STORAGE_ERROR', cause?: unknown) {
    super(message, code, cause);
    this.name = 'StorageError';
  }
}

/**
 * 認証エラー
 */
export class AuthError extends AppError {
  constructor(message: string, code: string = 'AUTH_ERROR', cause?: unknown) {
    super(message, code, cause);
    this.name = 'AuthError';
  }
}

/**
 * 検証エラー
 */
export class ValidationError extends AppError {
  constructor(message: string, code: string = 'VALIDATION_ERROR', cause?: unknown) {
    super(message, code, cause);
    this.name = 'ValidationError';
  }
}

/**
 * Health Connect関連のエラー
 */
export class HealthConnectError extends AppError {
  constructor(message: string, code: string = 'HEALTH_CONNECT_ERROR', cause?: unknown) {
    super(message, code, cause);
    this.name = 'HealthConnectError';
  }
}

/**
 * 不明なエラー
 */
export class UnknownError extends AppError {
  constructor(message: string, code: string = 'UNKNOWN_ERROR', cause?: unknown) {
    super(message, code, cause);
    this.name = 'UnknownError';
  }
}
