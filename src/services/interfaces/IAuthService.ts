import { User } from '@react-native-google-signin/google-signin';

export interface IAuthService {
  configure(webClientId: string): void;
  isSignedIn(): Promise<boolean>;
  getCurrentUser(): Promise<User | null>;
  signIn(): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }>;
  signOut(): Promise<void>;
  getOrRefreshAccessToken(): Promise<string | null>;
}
