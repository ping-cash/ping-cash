/**
 * Auth store — in-memory + AsyncStorage-backed for persistence.
 *
 * Tracks JWT access + refresh tokens, current user, wallet address.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, type User } from './api';

const TOKEN_KEY = '@ping/access_token';
const REFRESH_KEY = '@ping/refresh_token';
const USER_KEY = '@ping/user';

class AuthStore {
  user: User | null = null;
  accessToken: string | null = null;
  refreshToken: string | null = null;

  async hydrate(): Promise<void> {
    // EVERY operation must be try/caught — this runs at launch and any
    // uncaught throw becomes an RCTExceptionsManager.reportException →
    // fatal crash before any UI renders.
    try {
      const [token, refresh, userStr] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY).catch(() => null),
        AsyncStorage.getItem(REFRESH_KEY).catch(() => null),
        AsyncStorage.getItem(USER_KEY).catch(() => null),
      ]);
      this.accessToken = token;
      this.refreshToken = refresh;
      if (userStr) {
        try {
          this.user = JSON.parse(userStr) as User;
        } catch {
          // Corrupted user record. Treat as logged out + clear it.
          this.user = null;
          AsyncStorage.removeItem(USER_KEY).catch(() => {});
        }
      } else {
        this.user = null;
      }
      if (this.accessToken) api.setToken(this.accessToken);
    } catch {
      // Storage layer failure → start with empty auth, do not crash.
      this.accessToken = null;
      this.refreshToken = null;
      this.user = null;
    }
  }

  async setSession(input: {
    accessToken: string;
    refreshToken: string;
    user: User;
  }): Promise<void> {
    this.accessToken = input.accessToken;
    this.refreshToken = input.refreshToken;
    this.user = input.user;
    api.setToken(input.accessToken);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, input.accessToken),
      AsyncStorage.setItem(REFRESH_KEY, input.refreshToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(input.user)),
    ]);
  }

  async updateUser(patch: Partial<User>): Promise<void> {
    if (!this.user) return;
    this.user = { ...this.user, ...patch };
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(this.user));
    } catch {
      // Storage failure is non-fatal — in-memory state still has the
      // new value for the current session.
    }
  }

  async clear(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    api.setToken(null);
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(REFRESH_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.user;
  }
}

export const authStore = new AuthStore();
