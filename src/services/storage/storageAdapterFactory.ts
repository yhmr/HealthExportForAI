// ストレージアダプターファクトリ
// テスト容易性とDIのためにアダプター生成を一元管理

import { googleAuthService } from '../../services/infrastructure/GoogleAuthService';
import { IAuthService } from '../infrastructure/types';
import { GoogleDriveAdapter } from './GoogleDriveAdapter';
import { GoogleSheetsAdapter } from './GoogleSheetsAdapter';
import { FileOperations, FolderOperations, Initializable, SpreadsheetAdapter } from './types';

/**
 * ストレージアダプターファクトリのインターフェース
 */
export interface StorageAdapterFactory {
  // 目的別のメソッド
  createInitializer(): Initializable;
  createFolderOperations(): FolderOperations;
  createFileOperations(): FileOperations;

  createSpreadsheetAdapter(): SpreadsheetAdapter;

  // 以前のメソッド（非推奨または一括取得用）
  createStorageAdapter(): Initializable & FolderOperations & FileOperations;
}

/**
 * Google用ストレージアダプターファクトリ実装
 * GoogleDrive/GoogleSheetsアダプターを生成
 */
export class GoogleStorageAdapterFactory implements StorageAdapterFactory {
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
export const storageAdapterFactory: StorageAdapterFactory = new GoogleStorageAdapterFactory(
  googleAuthService
);
