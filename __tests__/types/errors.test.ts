import {
  AppError,
  AuthError,
  HealthConnectError,
  NetworkError,
  StorageError,
  UnknownError,
  ValidationError
} from '../../src/types/errors';

describe('Error Types', () => {
  describe('AppError', () => {
    it('should hold message, code, and cause', () => {
      const cause = new Error('original error');
      const error = new AppError('Something went wrong', 'TEST_ERROR', cause);

      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('AppError');
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    it('should format toString correctly', () => {
      const error = new AppError('Error message', 'CODE');
      expect(error.toString()).toBe('[CODE] Error message');

      const errorWithCause = new AppError('Error message', 'CODE', 'cause');
      expect(errorWithCause.toString()).toBe('[CODE] Error message (Caused by: cause)');
    });
  });

  describe('Subclasses', () => {
    it('NetworkError', () => {
      const error = new NetworkError('Network failed');
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.name).toBe('NetworkError');
    });

    it('StorageError', () => {
      const error = new StorageError('Storage failed');
      expect(error).toBeInstanceOf(StorageError);
      expect(error.code).toBe('STORAGE_ERROR');
    });

    it('AuthError', () => {
      const error = new AuthError('Auth failed');
      expect(error).toBeInstanceOf(AuthError);
      expect(error.code).toBe('AUTH_ERROR');
    });

    it('ValidationError', () => {
      const error = new ValidationError('Validation failed');
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('HealthConnectError', () => {
      const error = new HealthConnectError('Health Connect failed');
      expect(error).toBeInstanceOf(HealthConnectError);
      expect(error.code).toBe('HEALTH_CONNECT_ERROR');
    });

    it('UnknownError', () => {
      const error = new UnknownError('Unknown error');
      expect(error).toBeInstanceOf(UnknownError);
      expect(error.code).toBe('UNKNOWN_ERROR');
    });
  });
});
