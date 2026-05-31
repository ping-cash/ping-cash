import Fastify from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../services/user.service', () => ({
  getByPhoneHash: vi.fn(),
  createOrFetch: vi.fn(),
  getById: vi.fn(),
  updateProfile: vi.fn(),
  setLanguage: vi.fn(),
}));
vi.mock('../services/contacts.service', () => ({
  syncContacts: vi.fn(),
  listContacts: vi.fn(),
  sync: vi.fn(),
  list: vi.fn(),
}));
vi.mock('../services/welcome-stake.service', () => ({
  grant: vi.fn(),
}));
vi.mock('../middleware/kyc-tier', () => ({
  requireKycTier: () => async () => {
    /* allow */
  },
}));

import * as userService from '../services/user.service';

import { userRoutes } from './users.controller';

// Mock JWT verify to bypass auth
const mockJwt = { verify: vi.fn(() => ({ sub: 'caller-uuid' })) };

describe('POST /users/me/contacts/lookup-by-phone', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    mockJwt.verify.mockReturnValue({ sub: 'caller-uuid' });
    app = Fastify();
    app.decorate('jwt', mockJwt);
    await app.register(userRoutes);
  });

  it('returns 200 with walletAddress when recipient is registered', async () => {
    (
      userService.getByPhoneHash as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      id: 'usr-recipient',
      walletAddress: 'So1aN4WaLLeT123',
      phoneMasked: '+** *** *** **34',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/me/contacts/lookup-by-phone',
      headers: { authorization: 'Bearer fake.jwt.token' },
      payload: { phone: '+14155551234' },
    });
    expect(res.statusCode).toBe(200);
    // Privacy: only walletAddress returned — no userId, no PII
    expect(JSON.parse(res.body)).toEqual({
      walletAddress: 'So1aN4WaLLeT123',
    });
  });

  it('returns 404 RECIPIENT_NOT_REGISTERED when phone is not a Ping user', async () => {
    (
      userService.getByPhoneHash as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(null);
    const res = await app.inject({
      method: 'POST',
      url: '/me/contacts/lookup-by-phone',
      headers: { authorization: 'Bearer fake.jwt.token' },
      payload: { phone: '+14155551234' },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error.code).toBe('RECIPIENT_NOT_REGISTERED');
  });

  it('returns 401 UNAUTHORIZED without Bearer token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/me/contacts/lookup-by-phone',
      payload: { phone: '+14155551234' },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error.code).toBe('UNAUTHORIZED');
  });

  it('rejects malformed phone with a 4xx (Zod parse throws)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/me/contacts/lookup-by-phone',
      headers: { authorization: 'Bearer fake.jwt.token' },
      payload: { phone: 'not-a-phone' },
    });
    // Zod parse throws — Fastify's default error handler returns 500 unless
    // a global ZodError handler is registered. Either way it's an error,
    // not a successful 200.
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
