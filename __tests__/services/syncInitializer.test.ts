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
    getOrRefreshAccessToken: vi.fn()
  }
}));

vi.mock('../../src/config/driveConfig', () => ({
  WEB_CLIENT_ID: 'test-web-client-id'
}));

describe('syncInitializer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(googleAuthService.isSignedIn).mockResolvedValue(true);
    vi.mocked(googleAuthService.getOrRefreshAccessToken).mockResolvedValue(ok('access-token'));
  });

  describe('initializeForSync', () => {
    it('should return success when all initialization steps succeed', async () => {
      // Arrange
      vi.mocked(googleAuthService.isSignedIn).mockResolvedValue(true);
      vi.mocked(googleAuthService.getOrRefreshAccessToken).mockResolvedValue(ok('access-token'));
      vi.mocked(healthService.initialize).mockResolvedValue(ok(true));
      vi.mocked(healthService.hasPermissions).mockResolvedValue(ok(true));

      // Act
      const result = await initializeForSync();

      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(googleAuthService.configure).toHaveBeenCalled();
      expect(googleAuthService.isSignedIn).toHaveBeenCalled();
      expect(googleAuthService.getOrRefreshAccessToken).toHaveBeenCalled();
      expect(healthService.initialize).toHaveBeenCalled();
      expect(healthService.hasPermissions).toHaveBeenCalled();
    });

    it('should return auth_failed when user is not signed in', async () => {
      // Arrange
      vi.mocked(googleAuthService.isSignedIn).mockResolvedValue(false);

      // Act
      const result = await initializeForSync();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('auth_failed');
      expect(googleAuthService.getOrRefreshAccessToken).not.toHaveBeenCalled();
      expect(healthService.initialize).not.toHaveBeenCalled();
    });

    it('should return auth_failed when silent token fetch fails', async () => {
      // Arrange
      vi.mocked(googleAuthService.isSignedIn).mockResolvedValue(true);
      vi.mocked(googleAuthService.getOrRefreshAccessToken).mockResolvedValue(
        err(new AuthError('Token fetch failed', 'TOKEN_FETCH_FAILED'))
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
      vi.mocked(googleAuthService.getOrRefreshAccessToken).mockResolvedValue(ok('access-token'));
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
      vi.mocked(googleAuthService.getOrRefreshAccessToken).mockResolvedValue(ok('access-token'));
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
