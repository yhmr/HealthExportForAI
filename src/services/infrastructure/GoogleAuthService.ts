import { GoogleSignin, statusCodes, type User } from '@react-native-google-signin/google-signin';
import { AuthError } from '../../types/errors';
import { Result, err, ok } from '../../types/result';
import { logError } from '../debugLogService';
import { IAuthService } from './types';

// Google Drive APIとGoogle Sheets APIのスコープ
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets'
];

export class GoogleAuthService implements IAuthService {
  /** トークン取得のPromiseを保持（重複実行防止用） */
  private tokenRefreshPromise: Promise<Result<string, AuthError>> | null = null;

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

  async signIn(): Promise<Result<User, AuthError>> {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      if (userInfo.data) {
        return ok(userInfo.data);
      } else {
        return err(new AuthError('ユーザーデータが取得できませんでした', 'NO_USER_DATA'));
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return err(new AuthError('サインインがキャンセルされました', 'SIGN_IN_CANCELLED'));
      } else if (error.code === statusCodes.IN_PROGRESS) {
        return err(new AuthError('サインイン処理中です', 'IN_PROGRESS'));
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return err(
          new AuthError('Google Play Servicesが利用できません', 'PLAY_SERVICES_NOT_AVAILABLE')
        );
      } else {
        const message = error.message || '不明なエラー';
        await logError(error);
        return err(new AuthError(message, 'UNKNOWN_SIGN_IN_ERROR', error));
      }
    }
  }

  async signOut(): Promise<Result<void, AuthError>> {
    try {
      await GoogleSignin.signOut();
      return ok(undefined);
    } catch (error) {
      const authError = new AuthError('サインアウトに失敗しました', 'SIGN_OUT_ERROR', error);
      await logError(authError);
      return err(authError);
    }
  }

  async getOrRefreshAccessToken(): Promise<Result<string, AuthError>> {
    // すでに実行中のトークン取得処理があれば、その結果を待つ
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = (async (): Promise<Result<string, AuthError>> => {
      try {
        // 既存のトークン取得を試みる
        const tokens = await GoogleSignin.getTokens();
        return ok(tokens.accessToken);
      } catch (error: any) {
        await logError(
          new AuthError(`トークン取得エラー(1回目): ${error}`, 'TOKEN_FETCH_ERROR_1', error)
        );

        // "previous promise did not settle" エラーなどの場合、少し待って再試行
        if (error.message && error.message.includes('previous promise')) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          try {
            const retryTokens = await GoogleSignin.getTokens();
            return ok(retryTokens.accessToken);
          } catch (retryError) {
            await logError(
              new AuthError(
                `トークン取得エラー(リトライ): ${retryError}`,
                'TOKEN_FETCH_ERROR_RETRY',
                retryError
              )
            );
          }
        }

        // トークンが無効な場合、サイレントサインインを試みてトークンをリフレッシュ
        try {
          const userInfo = await GoogleSignin.signInSilently();
          if (userInfo.data) {
            // サイレントサインイン成功後、再度トークン取得
            const refreshedTokens = await GoogleSignin.getTokens();
            return ok(refreshedTokens.accessToken);
          }
        } catch (silentError) {
          await logError(
            new AuthError(
              `サイレントサインインエラー: ${silentError}`,
              'SILENT_SIGN_IN_ERROR',
              silentError
            )
          );
        }

        return err(new AuthError('アクセストークンの取得に失敗しました', 'TOKEN_FETCH_FAILED'));
      } finally {
        // 処理完了後にPromiseをクリア
        this.tokenRefreshPromise = null;
      }
    })();

    const result = await this.tokenRefreshPromise;
    return result;
  }
}

// シングルトンインスタンスの作成
export const googleAuthService = new GoogleAuthService();
