// アダプターファクトリ
// テスト容易性とDIのためにアダプター生成を一元管理

import { googleAuthService } from '../../services/infrastructure/googleAuth';
import { GoogleDriveAdapter } from './googleDriveAdapter';
import { GoogleSheetsAdapter } from './googleSheetsAdapter';
import type { SpreadsheetAdapter, StorageAdapter } from './interfaces';

/**
 * アダプターファクトリのインターフェース
 */
export interface AdapterFactory {
  createStorageAdapter(): StorageAdapter;
  createSpreadsheetAdapter(): SpreadsheetAdapter;
}

/**
 * デフォルトのアダプターファクトリ実装
 * GoogleDrive/GoogleSheetsアダプターを生成
 */
class DefaultAdapterFactory implements AdapterFactory {
  createStorageAdapter(): StorageAdapter {
    return new GoogleDriveAdapter(googleAuthService);
  }

  createSpreadsheetAdapter(): SpreadsheetAdapter {
    return new GoogleSheetsAdapter(googleAuthService);
  }
}

// シングルトンインスタンス
let currentFactory: AdapterFactory = new DefaultAdapterFactory();

/**
 * 現在のアダプターファクトリを取得
 */
export function getAdapterFactory(): AdapterFactory {
  return currentFactory;
}

/**
 * アダプターファクトリを設定（テスト用）
 * @param factory カスタムファクトリ
 */
export function setAdapterFactory(factory: AdapterFactory): void {
  currentFactory = factory;
}

/**
 * デフォルトファクトリにリセット（テスト用）
 */
export function resetAdapterFactory(): void {
  currentFactory = new DefaultAdapterFactory();
}

/**
 * ストレージアダプターを作成（ショートカット）
 */
export function createStorageAdapter(): StorageAdapter {
  return currentFactory.createStorageAdapter();
}

/**
 * スプレッドシートアダプターを作成（ショートカット）
 */
export function createSpreadsheetAdapter(): SpreadsheetAdapter {
  return currentFactory.createSpreadsheetAdapter();
}
