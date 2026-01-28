import { NetworkError, StorageError } from '../../types/errors';
import { err, Result } from '../../types/result';
import { IAuthService } from '../interfaces/IAuthService';
import {
  checkFolderExists,
  DEFAULT_FOLDER_NAME,
  downloadFileContent,
  findFile,
  findOrCreateFolder,
  updateFile,
  uploadFile
} from './googleDrive';
import type { FileInfo, FileOperations, FolderOperations, Initializable } from './interfaces';

export class GoogleDriveAdapter implements Initializable, FolderOperations, FileOperations {
  private accessToken: string | null = null;
  readonly defaultFolderName = DEFAULT_FOLDER_NAME;

  constructor(private authService: IAuthService) {}

  async initialize(): Promise<boolean> {
    // すでにサインインしているか確認
    const signedIn = await this.authService.isSignedIn();
    if (signedIn) {
      const result = await this.authService.getOrRefreshAccessToken();
      if (result.isOk()) {
        this.accessToken = result.unwrap();
        return !!this.accessToken;
      }
    }
    return false;
  }

  // Helper to run auth-protected operation
  private async runWithAuth<T>(
    operation: (token: string) => Promise<Result<T, StorageError | NetworkError>>
  ): Promise<Result<T, StorageError | NetworkError>> {
    const tokenResult = await this.authService.getOrRefreshAccessToken();
    if (tokenResult.isErr()) {
      const authErr = tokenResult.unwrapErr();
      return err(
        new StorageError(`Auth failed: ${authErr.message}`, 'AUTH_FAILED_ADAPTER', authErr)
      );
    }
    const token = tokenResult.unwrap();
    this.accessToken = token;
    return operation(token);
  }

  async findOrCreateFolder(
    folderName: string
  ): Promise<Result<string, StorageError | NetworkError>> {
    return this.runWithAuth((token) => findOrCreateFolder(folderName, token));
  }

  async checkFolderExists(folderId: string): Promise<Result<boolean, StorageError | NetworkError>> {
    return this.runWithAuth((token) => checkFolderExists(folderId, token));
  }

  async findFile(
    fileName: string,
    mimeType: string,
    folderId?: string
  ): Promise<Result<FileInfo | null, StorageError | NetworkError>> {
    return this.runWithAuth((token) => findFile(fileName, mimeType, token, folderId));
  }

  async uploadFile(
    content: string,
    fileName: string,
    mimeType: string,
    folderId?: string,
    isBase64?: boolean
  ): Promise<Result<string, StorageError | NetworkError>> {
    return this.runWithAuth((token) =>
      uploadFile(content, fileName, mimeType, token, folderId, isBase64)
    );
  }

  async updateFile(
    fileId: string,
    content: string,
    mimeType: string,
    isBase64?: boolean
  ): Promise<Result<boolean, StorageError | NetworkError>> {
    return this.runWithAuth((token) => updateFile(fileId, content, mimeType, token, isBase64));
  }

  async downloadFileContent(fileId: string): Promise<Result<string, StorageError | NetworkError>> {
    return this.runWithAuth((token) => downloadFileContent(fileId, token));
  }
}
