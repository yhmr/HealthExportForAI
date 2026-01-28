import { IAuthService } from '../../types/auth';
import { AuthError, NetworkError, StorageError } from '../../types/errors';
import { Result, err } from '../../types/result';
import { SpreadsheetAdapter } from '../../types/storage';
import {
  createSpreadsheet,
  fetchPDF,
  findSpreadsheet,
  getSheetData,
  updateHeaders,
  updateRows
} from './googleSheets';

export class GoogleSheetsAdapter implements SpreadsheetAdapter {
  private accessToken: string | null = null;

  constructor(private authService: IAuthService) {}

  private async ensureAccessToken(): Promise<Result<string, AuthError>> {
    if (!this.accessToken) {
      const result = await this.authService.getOrRefreshAccessToken();
      if (result.isOk()) {
        this.accessToken = result.unwrap();
      } else {
        return result;
      }
    }
    if (!this.accessToken) {
      return err(new AuthError('Google Sheets access token is missing', 'NO_TOKEN_SHEETS'));
    }
    return { isOk: () => true, isErr: () => false, unwrap: () => this.accessToken! } as any; // Hack: wrap in Result-like or just use Result.ok
    // Actually, I should just return Result<string, AuthError> properly.
  }

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
