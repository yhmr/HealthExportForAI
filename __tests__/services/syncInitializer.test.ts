import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeForSync } from '../../src/services/syncInitializer';

import { healthService } from '../../src/services/health/healthAdapterFactory';
import { googleAuthService } from '../../src/services/infrastructure/GoogleAuthService';
import { AuthError } from '../../src/types/errors';
import { err, ok } from '../../src/types/result';

// 依存モジュールのモック
vi.mock('../../src/services/debugLogService', () => ({
  addDebugLog: vi.fn()
}));

vi.mock('../../src/services/health/healthAdapterFactory', () => ({
  healthService: {
    initialize: vi.fn(),
    hasPermissions: vi.fn()
  }
}));

vi.mock('../../src/services/infrastructure/GoogleAuthService', () => ({
  googleAuthService: {
    configure: vi.fn(),
    isSignedIn: vi.fn(),
    signIn: vi.fn()
  }
}));

vi.mock('../../src/config/driveConfig', () => ({
  WEB_CLIENT_ID: 'test-web-client-id'
}));

// ダミーのUserオブジェクト（型チェックはモック内部で緩和）
const mockUser = { id: '123', name: 'Test User' } as any;

describe('syncInitializer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeForSync', () => {
    it('should return success when all initialization steps succeed', async () => {
      // Arrange
      vi.mocked(googleAuthService.isSignedIn).mockResolvedValue(true);
      vi.mocked(healthService.initialize).mockResolvedValue(ok(true));
      vi.mocked(healthService.hasPermissions).mockResolvedValue(ok(true));

      // Act
      const result = await initializeForSync();

      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(googleAuthService.configure).toHaveBeenCalled();
      expect(googleAuthService.isSignedIn).toHaveBeenCalled();
      expect(healthService.initialize).toHaveBeenCalled();
      expect(healthService.hasPermissions).toHaveBeenCalled();
    });

    it('should attempt sign-in if not already signed in', async () => {
      // Arrange
      vi.mocked(googleAuthService.isSignedIn).mockResolvedValue(false);
      vi.mocked(googleAuthService.signIn).mockResolvedValue(ok(mockUser));
      vi.mocked(healthService.initialize).mockResolvedValue(ok(true));
      vi.mocked(healthService.hasPermissions).mockResolvedValue(ok(true));

      // Act
      const result = await initializeForSync();

      // Assert
      expect(result.success).toBe(true);
      expect(googleAuthService.signIn).toHaveBeenCalled();
    });

    it('should return auth_failed when sign-in fails', async () => {
      // Arrange
      vi.mocked(googleAuthService.isSignedIn).mockResolvedValue(false);
      vi.mocked(googleAuthService.signIn).mockResolvedValue(
        err(new AuthError('Sign-in failed', 'SIGN_IN_CANCELLED'))
      );

      // Act
      const result = await initializeForSync();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('auth_failed');
      expect(healthService.initialize).not.toHaveBeenCalled();
    });

    it('should return health_connect_failed when Health Connect init fails', async () => {
      // Arrange
      vi.mocked(googleAuthService.isSignedIn).mockResolvedValue(true);
      vi.mocked(healthService.initialize).mockResolvedValue(ok(false));

      // Act
      const result = await initializeForSync();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('health_connect_failed');
      expect(healthService.hasPermissions).not.toHaveBeenCalled();
    });

    it('should return permission_denied when permissions are missing', async () => {
      // Arrange
      vi.mocked(googleAuthService.isSignedIn).mockResolvedValue(true);
      vi.mocked(healthService.initialize).mockResolvedValue(ok(true));
      vi.mocked(healthService.hasPermissions).mockResolvedValue(ok(false));

      // Act
      const result = await initializeForSync();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('permission_denied');
    });

    it('should handle auth check exception gracefully', async () => {
      // Arrange
      vi.mocked(googleAuthService.isSignedIn).mockRejectedValue(new Error('Network error'));

      // Act
      const result = await initializeForSync();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('auth_failed');
    });
  });
});
