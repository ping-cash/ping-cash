import Fastify from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../services/user.service', () => ({
  getByPhoneHash: vi.fn(),
  // Stubs for other named exports referenced by the controller — keep them as no-ops.
  createOrFetch: vi.fn(),
  getById: vi.fn(),
  updateProfile: vi.fn(),
  setLanguage: vi.fn(),
}));
vi.mock('../services/contacts.service', () => ({
  syncContacts: vi.fn(),
  listContacts: vi.fn(),
}));
vi.mock('../services/welcome-stake.service', () => ({
  grant: vi.fn(),
}));
vi.mock('../middleware/kyc-tier', () => ({
  requireKycTier: () => async () => {
    /* allow */
  },
}));
vi.mock('../utils/auth', () => ({
  requireAuth: async () => 'mock-user-id',
}));

import * as userService from '../services/user.service';

import { userRoutes } from './users.controller';

const VALID_HASH = 'a'.repeat(64);
const INVALID_HASH = 'NOT_HEX';

describe('GET /users/internal/by-phone-hash/:hash', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    app = Fastify();
    await app.register(userRoutes);
  });

  it('returns 200 with userId + walletAddress when user exists', async () => {
    (
      userService.getByPhoneHash as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      id: 'usr-uuid-x',
      walletAddress: 'wal',
      phoneMasked: '+** *** *** **aa',
    });
    const res = await app.inject({
      method: 'GET',
      url: `/internal/by-phone-hash/${VALID_HASH}`,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      userId: 'usr-uuid-x',
      walletAddress: 'wal',
    });
  });

  it('returns 404 USER_NOT_FOUND when no user matches', async () => {
    (
      userService.getByPhoneHash as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(null);
    const res = await app.inject({
      method: 'GET',
      url: `/internal/by-phone-hash/${VALID_HASH}`,
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error.code).toBe('USER_NOT_FOUND');
  });

  it('returns 400 INVALID_PHONE_HASH on malformed input', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/internal/by-phone-hash/${INVALID_HASH}`,
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('INVALID_PHONE_HASH');
  });
});
