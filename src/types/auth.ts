import { User } from '@react-native-google-signin/google-signin';

import { AuthError } from './errors';
import { Result } from './result';

export interface IAuthService {
  configure(webClientId: string): void;
  isSignedIn(): Promise<boolean>;
  getCurrentUser(): Promise<User | null>;
  signIn(): Promise<Result<User, AuthError>>;
  signOut(): Promise<Result<void, AuthError>>;
  getOrRefreshAccessToken(): Promise<Result<string, AuthError>>;
}
