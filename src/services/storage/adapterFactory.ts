// アダプターファクトリ
// テスト容易性とDIのためにアダプター生成を一元管理

import { googleAuthService } from '../../services/infrastructure/googleAuth';
import type { IAuthService } from '../interfaces/IAuthService';
import { GoogleDriveAdapter } from './GoogleDriveAdapter';
import { GoogleSheetsAdapter } from './GoogleSheetsAdapter';
import type {
  FileOperations,
  FolderOperations,
  Initializable,
  SpreadsheetAdapter
} from './interfaces';

/**
 * アダプターファクトリのインターフェース
 */
export interface AdapterFactory {
  // 目的別のメソッド
  createInitializer(): Initializable;
  createFolderOperations(): FolderOperations;
  createFileOperations(): FileOperations;

  createSpreadsheetAdapter(): SpreadsheetAdapter;

  // 以前のメソッド（非推奨または一括取得用）
  createStorageAdapter(): Initializable & FolderOperations & FileOperations;
}

/**
 * デフォルトのアダプターファクトリ実装
 * GoogleDrive/GoogleSheetsアダプターを生成
 */
export class DefaultAdapterFactory implements AdapterFactory {
  constructor(private authService: IAuthService) {}

  createInitializer(): Initializable {
    return new GoogleDriveAdapter(this.authService);
  }

  createFolderOperations(): FolderOperations {
    return new GoogleDriveAdapter(this.authService);
  }

  createFileOperations(): FileOperations {
    return new GoogleDriveAdapter(this.authService);
  }

  createStorageAdapter(): Initializable & FolderOperations & FileOperations {
    return new GoogleDriveAdapter(this.authService);
  }

  createSpreadsheetAdapter(): SpreadsheetAdapter {
    return new GoogleSheetsAdapter(this.authService);
  }
}

// シングルトンインスタンス（デフォルトでgoogleAuthServiceを使用）
let currentFactory: AdapterFactory = new DefaultAdapterFactory(googleAuthService);

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
  currentFactory = new DefaultAdapterFactory(googleAuthService);
}

/**
 * 初期化用アダプターを作成
 */
export function createInitializer(): Initializable {
  return currentFactory.createInitializer();
}

/**
 * フォルダ操作用アダプターを作成
 */
export function createFolderOperations(): FolderOperations {
  return currentFactory.createFolderOperations();
}

/**
 * ファイル操作用アダプターを作成
 */
export function createFileOperations(): FileOperations {
  return currentFactory.createFileOperations();
}

/**
 * ストレージアダプターを作成（一括機能）
 */
export function createStorageAdapter(): Initializable & FolderOperations & FileOperations {
  return currentFactory.createStorageAdapter();
}

/**
 * スプレッドシートアダプターを作成（ショートカット）
 */
export function createSpreadsheetAdapter(): SpreadsheetAdapter {
  return currentFactory.createSpreadsheetAdapter();
}
