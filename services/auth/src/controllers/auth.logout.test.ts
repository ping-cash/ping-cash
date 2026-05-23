import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockLogout = vi.fn();
vi.mock('../services/auth.service', () => ({
  init: vi.fn(),
  verify: vi.fn(),
  refresh: vi.fn(),
  logout: (jti: string) => mockLogout(jti),
}));

import { authRoutes } from './auth.controller';

const JWT_SECRET = 'test-secret-32-chars-minimum-length-for-hs256-only-ok';

async function appWithJwt() {
  const app = Fastify();
  await app.register(jwt, { secret: JWT_SECRET });
  await app.register(authRoutes, { prefix: '/auth' });
  return app;
}

describe('POST /auth/logout — token type guard (per #55)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when Authorization header missing', async () => {
    const app = await appWithJwt();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      payload: {},
    });
    expect(res.statusCode).toBe(401);
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('returns 400 WRONG_TOKEN_TYPE when access token is used (no jti)', async () => {
    const app = await appWithJwt();
    // Access token: has sub but NO jti and NO type=refresh
    const accessToken = app.jwt.sign({ sub: 'usr_abc', type: 'access' });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('WRONG_TOKEN_TYPE');
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('returns 204 + revokes when refresh token is used', async () => {
    const app = await appWithJwt();
    const refreshToken = app.jwt.sign({
      sub: 'usr_abc',
      jti: 'jti-12345',
      type: 'refresh',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: `Bearer ${refreshToken}` },
      payload: {},
    });
    expect(res.statusCode).toBe(204);
    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockLogout).toHaveBeenCalledWith('jti-12345');
  });

  it('returns 400 when token has jti but no type=refresh marker', async () => {
    const app = await appWithJwt();
    const ambiguousToken = app.jwt.sign({ sub: 'usr_abc', jti: 'jti-12345' });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: `Bearer ${ambiguousToken}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(mockLogout).not.toHaveBeenCalled();
  });
});
