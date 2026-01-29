// アダプターファクトリ
// テスト容易性とDIのためにアダプター生成を一元管理

import { googleAuthService } from '../../services/infrastructure/GoogleAuthService';
import { IAuthService } from '../../types/auth';
import {
  FileOperations,
  FolderOperations,
  Initializable,
  SpreadsheetAdapter
} from '../../types/storage';
import { GoogleDriveAdapter } from './GoogleDriveAdapter';
import { GoogleSheetsAdapter } from './GoogleSheetsAdapter';

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
export const adapterFactory: AdapterFactory = new DefaultAdapterFactory(googleAuthService);
