import { GoogleSignin, statusCodes, type User } from '@react-native-google-signin/google-signin';
import { addDebugLog } from '../debugLogService';
import { IAuthService } from '../interfaces/IAuthService';

// Google Drive APIとGoogle Sheets APIのスコープ
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets'
];

export class GoogleAuthService implements IAuthService {
  /** トークン取得のPromiseを保持（重複実行防止用） */
  private tokenRefreshPromise: Promise<string | null> | null = null;

  configure(webClientId: string): void {
    GoogleSignin.configure({
      scopes: SCOPES,
      webClientId,
      offlineAccess: true
    });
  }

  async isSignedIn(): Promise<boolean> {
    return GoogleSignin.hasPreviousSignIn();
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userInfo = await GoogleSignin.signInSilently();
      return userInfo.data;
    } catch {
      return null;
    }
  }

  async signIn(): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      return { success: true, user: userInfo.data ?? undefined };
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return { success: false, error: 'サインインがキャンセルされました' };
      } else if (error.code === statusCodes.IN_PROGRESS) {
        return { success: false, error: 'サインイン処理中です' };
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { success: false, error: 'Google Play Servicesが利用できません' };
      } else {
        return { success: false, error: error.message || '不明なエラー' };
      }
    }
  }

  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      await addDebugLog(`サインアウトエラー: ${error}`, 'error');
    }
  }

  async getOrRefreshAccessToken(): Promise<string | null> {
    // すでに実行中のトークン取得処理があれば、その結果を待つ
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = (async () => {
      try {
        // 既存のトークン取得を試みる
        const tokens = await GoogleSignin.getTokens();
        return tokens.accessToken;
      } catch (error: any) {
        await addDebugLog(`トークン取得エラー(1回目): ${error}`, 'error');

        // "previous promise did not settle" エラーなどの場合、少し待って再試行
        if (error.message && error.message.includes('previous promise')) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          try {
            const retryTokens = await GoogleSignin.getTokens();
            return retryTokens.accessToken;
          } catch (retryError) {
            await addDebugLog(`トークン取得エラー(リトライ): ${retryError}`, 'error');
          }
        }

        // トークンが無効な場合、サイレントサインインを試みてトークンをリフレッシュ
        try {
          const userInfo = await GoogleSignin.signInSilently();
          if (userInfo.data) {
            // サイレントサインイン成功後、再度トークン取得
            const refreshedTokens = await GoogleSignin.getTokens();
            return refreshedTokens.accessToken;
          }
        } catch (silentError) {
          await addDebugLog(`サイレントサインインエラー: ${silentError}`, 'error');
        }

        return null;
      } finally {
        // 処理完了後にPromiseをクリア
        this.tokenRefreshPromise = null;
      }
    })();

    const result = await this.tokenRefreshPromise;
    return result;
  }
}
