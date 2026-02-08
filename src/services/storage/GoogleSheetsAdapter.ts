import { NetworkError, StorageError } from '../../types/errors';
import { Result, err } from '../../types/result';
import { IAuthService } from '../infrastructure/types';
import {
  createSpreadsheet,
  fetchPDF,
  findSpreadsheet,
  getSheetData,
  updateHeaders,
  updateRows
} from './googleSheets';
import { SpreadsheetAdapter } from './types';

export class GoogleSheetsAdapter implements SpreadsheetAdapter {
  private accessToken: string | null = null;

  constructor(private authService: IAuthService) {}

  // Helper to run auth-protected operation
  private async runWithAuth<T>(
    operation: (token: string) => Promise<Result<T, StorageError | NetworkError>>
  ): Promise<Result<T, StorageError | NetworkError>> {
    const tokenResult = await this.authService.getOrRefreshAccessToken();
    if (tokenResult.isErr()) {
      // Convert AuthError to StorageError (or keep as error if signature allows? Interfaces allow StorageError | NetworkError)
      // I should probably expand interface to allow AuthError, or wrap it.
      // Let's wrap it in StorageError for now to satisfy interface, or expand interface.
      // Interface says StorageError | NetworkError.
      // I will return StorageError wrapping AuthError msg.
      const authErr = tokenResult.unwrapErr();
      return err(
        new StorageError(`Auth failed: ${authErr.message}`, 'AUTH_FAILED_ADAPTER', authErr)
      );
    }
    const token = tokenResult.unwrap();
    this.accessToken = token; // Cache it
    return operation(token);
  }

  async findSpreadsheet(
    fileName: string,
    folderId?: string
  ): Promise<Result<string | null, StorageError | NetworkError>> {
    return this.runWithAuth((token) => findSpreadsheet(fileName, token, folderId));
  }

  async createSpreadsheet(
    fileName: string,
    headers: string[],
    folderId?: string
  ): Promise<Result<string, StorageError | NetworkError>> {
    return this.runWithAuth((token) => createSpreadsheet(fileName, headers, token, folderId));
  }

  async getSheetData(
    spreadsheetId: string
  ): Promise<Result<{ headers: string[]; rows: string[][] }, StorageError | NetworkError>> {
    return this.runWithAuth((token) => getSheetData(spreadsheetId, token));
  }

  async updateHeaders(
    spreadsheetId: string,
    headers: string[]
  ): Promise<Result<boolean, StorageError | NetworkError>> {
    return this.runWithAuth((token) => updateHeaders(spreadsheetId, headers, token));
  }

  async updateRows(
    spreadsheetId: string,
    startRow: number,
    rows: (string | number | null)[][]
  ): Promise<Result<boolean, StorageError | NetworkError>> {
    return this.runWithAuth((token) => updateRows(spreadsheetId, startRow, rows, token));
  }

  async fetchPDF(spreadsheetId: string): Promise<Result<string, StorageError | NetworkError>> {
    return this.runWithAuth((token) => fetchPDF(spreadsheetId, token));
  }
}
