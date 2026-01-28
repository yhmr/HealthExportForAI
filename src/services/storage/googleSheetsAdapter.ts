import { IAuthService } from '../interfaces/IAuthService';
import {
  createSpreadsheet,
  fetchPDF,
  findSpreadsheet,
  getSheetData,
  updateHeaders,
  updateRows
} from './googleSheets';
import type { SpreadsheetAdapter } from './interfaces';

export class GoogleSheetsAdapter implements SpreadsheetAdapter {
  private accessToken: string | null = null;

  constructor(private authService: IAuthService) {}

  private async ensureAccessToken(): Promise<string> {
    if (!this.accessToken) {
      this.accessToken = await this.authService.getOrRefreshAccessToken();
    }
    if (!this.accessToken) {
      throw new Error('Google Sheets access token is missing. Please sign in.');
    }
    return this.accessToken;
  }

  async findSpreadsheet(fileName: string, folderId?: string): Promise<string | null> {
    const token = await this.ensureAccessToken();
    return findSpreadsheet(fileName, token, folderId);
  }

  async createSpreadsheet(
    fileName: string,
    headers: string[],
    folderId?: string
  ): Promise<string | null> {
    const token = await this.ensureAccessToken();
    return createSpreadsheet(fileName, headers, token, folderId);
  }

  async getSheetData(
    spreadsheetId: string
  ): Promise<{ headers: string[]; rows: string[][] } | null> {
    const token = await this.ensureAccessToken();
    return getSheetData(spreadsheetId, token);
  }

  async updateHeaders(spreadsheetId: string, headers: string[]): Promise<boolean> {
    const token = await this.ensureAccessToken();
    return updateHeaders(spreadsheetId, headers, token);
  }

  async updateRows(
    spreadsheetId: string,
    startRow: number,
    rows: (string | number | null)[][]
  ): Promise<boolean> {
    const token = await this.ensureAccessToken();
    return updateRows(spreadsheetId, startRow, rows, token);
  }

  async fetchPDF(spreadsheetId: string): Promise<string | null> {
    const token = await this.ensureAccessToken();
    return fetchPDF(spreadsheetId, token);
  }
}
