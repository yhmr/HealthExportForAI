import type { StorageAdapter, FileInfo } from './interfaces';
import {
    findOrCreateFolder,
    checkFolderExists,
    findFile,
    uploadFile,
    updateFile,
    downloadFileContent,
    DEFAULT_FOLDER_NAME
} from './googleDrive';
import { getAccessToken, isSignedIn, signIn } from '../googleAuth';

export class GoogleDriveAdapter implements StorageAdapter {
    private accessToken: string | null = null;
    readonly defaultFolderName = DEFAULT_FOLDER_NAME;

    async initialize(): Promise<boolean> {
        // すでにサインインしているか確認
        const signedIn = await isSignedIn();
        if (signedIn) {
            this.accessToken = await getAccessToken();
            return !!this.accessToken;
        }
        return false;
    }

    private async ensureAccessToken(): Promise<string> {
        if (!this.accessToken) {
            this.accessToken = await getAccessToken();
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

    async uploadFile(content: string, fileName: string, mimeType: string, folderId?: string): Promise<string | null> {
        const token = await this.ensureAccessToken();
        return uploadFile(content, fileName, mimeType, token, folderId);
    }

    async updateFile(fileId: string, content: string, mimeType: string): Promise<boolean> {
        const token = await this.ensureAccessToken();
        return updateFile(fileId, content, mimeType, token);
    }

    async downloadFileContent(fileId: string): Promise<string | null> {
        const token = await this.ensureAccessToken();
        return downloadFileContent(fileId, token);
    }
}
