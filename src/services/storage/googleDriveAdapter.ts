import { getOrRefreshAccessToken, isSignedIn } from '../googleAuth';
import {
  checkFolderExists,
  DEFAULT_FOLDER_NAME,
  downloadFileContent,
  findFile,
  findOrCreateFolder,
  updateFile,
  uploadFile
} from './googleDrive';
import type { FileInfo, StorageAdapter } from './interfaces';

export class GoogleDriveAdapter implements StorageAdapter {
  private accessToken: string | null = null;
  readonly defaultFolderName = DEFAULT_FOLDER_NAME;

  async initialize(): Promise<boolean> {
    // すでにサインインしているか確認
    const signedIn = await isSignedIn();
    if (signedIn) {
      this.accessToken = await getOrRefreshAccessToken();
      return !!this.accessToken;
    }
    return false;
  }

  private async ensureAccessToken(): Promise<string> {
    if (!this.accessToken) {
      this.accessToken = await getOrRefreshAccessToken();
    }
    if (!this.accessToken) {
      throw new Error('Google Drive access token is missing. Please sign in.');
    }
    return this.accessToken;
  }

  async findOrCreateFolder(folderName: string): Promise<string | null> {
    const token = await this.ensureAccessToken();
    return findOrCreateFolder(folderName, token);
  }

  async checkFolderExists(folderId: string): Promise<boolean> {
    const token = await this.ensureAccessToken();
    return checkFolderExists(folderId, token);
  }

  async findFile(fileName: string, mimeType: string, folderId?: string): Promise<FileInfo | null> {
    const token = await this.ensureAccessToken();
    return findFile(fileName, mimeType, token, folderId);
  }

  async uploadFile(
    content: string,
    fileName: string,
    mimeType: string,
    folderId?: string,
    isBase64?: boolean
  ): Promise<string | null> {
    const token = await this.ensureAccessToken();
    return uploadFile(content, fileName, mimeType, token, folderId, isBase64);
  }

  async updateFile(
    fileId: string,
    content: string,
    mimeType: string,
    isBase64?: boolean
  ): Promise<boolean> {
    const token = await this.ensureAccessToken();
    return updateFile(fileId, content, mimeType, token, isBase64);
  }

  async downloadFileContent(fileId: string): Promise<string | null> {
    const token = await this.ensureAccessToken();
    return downloadFileContent(fileId, token);
  }
}
