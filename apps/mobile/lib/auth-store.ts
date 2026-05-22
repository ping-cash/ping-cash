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
    const [token, refresh, userStr] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(REFRESH_KEY),
      AsyncStorage.getItem(USER_KEY),
    ]);
    this.accessToken = token;
    this.refreshToken = refresh;
    this.user = userStr ? (JSON.parse(userStr) as User) : null;
    if (this.accessToken) api.setToken(this.accessToken);
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
