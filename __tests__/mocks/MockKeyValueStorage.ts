import { IKeyValueStorage } from '../../src/services/infrastructure/types';

export class MockKeyValueStorage implements IKeyValueStorage {
  private data: Record<string, string> = {};

  async getItem(key: string): Promise<string | null> {
    return this.data[key] || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.data[key] = value;
  }

  async removeItem(key: string): Promise<void> {
    delete this.data[key];
  }

  // Test helper
  clear() {
    this.data = {};
  }
}
