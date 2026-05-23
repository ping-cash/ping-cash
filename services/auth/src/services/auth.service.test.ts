/**
 * Unit tests for auth-service.
 *
 * Per PRINCIPLES § 4.6 ("Trust internal code; validate at boundaries"):
 * - Stubs at boundaries (Twilio, Privy, Redis)
 * - Tests behavior, not just string presence
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@ping/config', () => ({
  loadConfig: () => ({
    NODE_ENV: 'test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret-key-min-32-chars-long-for-hs256-jwt',
    JWT_ACCESS_TOKEN_TTL: '15m',
    JWT_REFRESH_TOKEN_TTL: '7d',
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TWILIO_VERIFY_SID: '',
    PRIVY_APP_ID: '',
    PRIVY_APP_SECRET: '',
    API_PORT: 3001,
  }),
}));

vi.mock('../utils/redis', () => {
  const otpSessions = new Map<string, unknown>();
  const refreshTokens = new Map<string, unknown>();
  const rateLimits = new Map<string, number>();

  return {
    redis: {
      ping: async () => 'PONG',
      connect: async () => {},
      quit: async () => {},
    },
    connectRedis: async () => {},
    disconnectRedis: async () => {},
    storeOtpSession: async (id: string, data: unknown) => {
      otpSessions.set(id, data);
    },
    readOtpSession: async (id: string) => otpSessions.get(id) ?? null,
    incrementOtpAttempts: async (id: string) => {
      const s = otpSessions.get(id) as { attempts: number } | undefined;
      if (!s) return 0;
      s.attempts += 1;
      otpSessions.set(id, s);
      return s.attempts;
    },
    deleteOtpSession: async (id: string) => {
      otpSessions.delete(id);
    },
    storeRefreshToken: async (jti: string, data: unknown) => {
      refreshTokens.set(jti, data);
    },
    readRefreshToken: async (jti: string) => refreshTokens.get(jti) ?? null,
    revokeRefreshToken: async (jti: string) => {
      refreshTokens.delete(jti);
    },
    checkInitRateLimit: async (ip: string) => {
      const count = (rateLimits.get(ip) ?? 0) + 1;
      rateLimits.set(ip, count);
      return {
        allowed: count <= 5,
        remaining: Math.max(0, 5 - count),
        resetIn: 600,
      };
    },
    __resetMockState: () => {
      otpSessions.clear();
      refreshTokens.clear();
      rateLimits.clear();
    },
  };
});

vi.mock('./twilio.service', () => ({
  sendOtp: vi.fn().mockResolvedValue({ sid: 'twilio_mock_sid', status: 'pending' }),
  verifyOtp: vi.fn().mockImplementation((_phone: string, code: string) =>
    Promise.resolve(code === '123456'),
  ),
}));

vi.mock('./privy.service', () => ({
  bindPhoneToWallet: vi.fn().mockResolvedValue({
    privyUserId: 'did:privy:mock:user',
    walletAddress: '7xKp2mN9qL4rYzAhmd5xKp2mN9qL4rYzAhmd5xKp2',
    isNewUser: true,
  }),
}));

// Now import the service under test
import * as redisMock from '../utils/redis';

import * as authService from './auth.service';

const mockJwt = {
  sign: vi.fn().mockImplementation((payload: object) => `mock_jwt_${JSON.stringify(payload).slice(0, 20)}`),
};
const mockApp = { jwt: mockJwt as never };

describe('auth.service.init', () => {
  beforeEach(() => {
    (redisMock as unknown as { __resetMockState: () => void }).__resetMockState();
    vi.clearAllMocks();
  });

  it('returns a session ID for a valid phone', async () => {
    const result = await authService.init('+971501234567', '1.2.3.4');
    expect(result.sessionId).toMatch(/^sess_/);
    expect(result.expiresIn).toBe(600);
    expect(result.channel).toBe('sms');
  });

  it('rejects invalid phone format', async () => {
    await expect(authService.init('123', '1.2.3.4')).rejects.toThrow();
    await expect(authService.init('not-a-phone', '1.2.3.4')).rejects.toThrow();
    await expect(authService.init('+971', '1.2.3.4')).rejects.toThrow();
  });

  it('enforces rate limit per IP', async () => {
    // 5 allowed
    for (let i = 0; i < 5; i++) {
      await authService.init('+971501234567', '1.2.3.4');
    }
    // 6th should fail
    await expect(authService.init('+971501234567', '1.2.3.4')).rejects.toThrow(/RATE_LIMITED|Too many/);
  });
});

describe('auth.service.verify', () => {
  beforeEach(() => {
    (redisMock as unknown as { __resetMockState: () => void }).__resetMockState();
    vi.clearAllMocks();
  });

  it('returns JWT pair + wallet address on valid OTP', async () => {
    const init = await authService.init('+971501234567', '1.2.3.4');
    const result = await authService.verify(init.sessionId, '123456', mockApp);

    expect(result.user.id).toMatch(/^usr_/);
    expect(result.user.walletAddress).toBe('7xKp2mN9qL4rYzAhmd5xKp2mN9qL4rYzAhmd5xKp2');
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
    expect(result.tokens.expiresIn).toBe(900);
    expect(result.isNewUser).toBe(true);
  });

  it('masks phone in returned user object', async () => {
    const init = await authService.init('+971501234567', '1.2.3.4');
    const result = await authService.verify(init.sessionId, '123456', mockApp);
    expect(result.user.phone).toContain('***');
    expect(result.user.phone).not.toContain('501234');
  });

  it('rejects invalid OTP', async () => {
    const init = await authService.init('+971501234567', '1.2.3.4');
    await expect(authService.verify(init.sessionId, '000000', mockApp)).rejects.toMatchObject({ code: 'INVALID_OTP' });
  });

  it('rejects invalid OTP format', async () => {
    const init = await authService.init('+971501234567', '1.2.3.4');
    await expect(authService.verify(init.sessionId, 'abc', mockApp)).rejects.toThrow();
    await expect(authService.verify(init.sessionId, '12345', mockApp)).rejects.toThrow();
  });

  it('rejects unknown session', async () => {
    await expect(authService.verify('sess_does_not_exist', '123456', mockApp)).rejects.toMatchObject(
      { code: 'SESSION_NOT_FOUND' },
    );
  });

  it('locks out after 5 failed attempts', async () => {
    const init = await authService.init('+971501234567', '1.2.3.4');
    for (let i = 0; i < 5; i++) {
      await expect(authService.verify(init.sessionId, '000000', mockApp)).rejects.toThrow();
    }
    // 6th attempt should hit MAX_ATTEMPTS
    await expect(authService.verify(init.sessionId, '123456', mockApp)).rejects.toMatchObject(
      { code: 'MAX_ATTEMPTS' },
    );
  });
});

describe('auth.service.refresh', () => {
  beforeEach(() => {
    (redisMock as unknown as { __resetMockState: () => void }).__resetMockState();
    vi.clearAllMocks();
  });

  it('issues new tokens via valid refresh token', async () => {
    const init = await authService.init('+971501234567', '1.2.3.4');
    const verifyResult = await authService.verify(init.sessionId, '123456', mockApp);

    // Extract jti — in real flow, jwt.verify would decode this
    // For the test, we just simulate the refresh path with a valid payload
    const payload = { sub: verifyResult.user.id, jti: 'fake-jti-not-in-redis' };

    // First, store the refresh token jti in our mock redis
    await redisMock.storeRefreshToken('fake-jti-not-in-redis', {
      userId: verifyResult.user.id,
      phoneHash: verifyResult.user.phoneHash,
      issuedAt: Date.now(),
    });

    const refreshed = await authService.refresh(payload, mockApp);
    expect(refreshed.accessToken).toBeTruthy();
    expect(refreshed.refreshToken).toBeTruthy();
    expect(refreshed.expiresIn).toBe(900);
  });

  it('rejects revoked refresh token', async () => {
    const payload = { sub: 'usr_test', jti: 'revoked-jti' };
    await expect(authService.refresh(payload, mockApp)).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
  });
});

describe('auth.service.logout', () => {
  beforeEach(() => {
    (redisMock as unknown as { __resetMockState: () => void }).__resetMockState();
    vi.clearAllMocks();
  });

  it('revokes refresh token', async () => {
    const jti = 'logout-test-jti';
    await redisMock.storeRefreshToken(jti, {
      userId: 'usr_test',
      phoneHash: 'hash',
      issuedAt: Date.now(),
    });

    await authService.logout(jti);
    const after = await redisMock.readRefreshToken(jti);
    expect(after).toBeNull();
  });
});
