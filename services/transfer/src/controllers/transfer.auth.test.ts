import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Locks the contract from #53: the authenticate() middleware MUST set
// (request as any).userId = payload.sub from a valid JWT, NOT the placeholder
// 'usr_development'. A regression that restores the placeholder breaks CI.

const mockCreate = vi.fn();
vi.mock('../services/transfer.service', () => ({
  TransferService: class {
    createTransfer = mockCreate;
    getTransfer = vi.fn();
    listTransfers = vi.fn();
    cancelTransfer = vi.fn();
  },
}));

import { transferRoutes } from './transfer.controller';

const JWT_SECRET = 'test-secret-32-chars-minimum-length-for-hs256-only-ok';

async function appWithJwt() {
  const app = Fastify();
  await app.register(jwt, { secret: JWT_SECRET });
  await app.register(transferRoutes, { prefix: '/transfers' });
  return app;
}

describe('transfer-service authenticate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({
      id: 'txn_x',
      senderId: 'whatever',
      recipientPhone: '+639171234567',
      recipientPhoneHash: 'h',
      amount: { amount: '10', currency: 'USD' },
      fees: { amount: '0', currency: 'USD' },
      status: 'pending',
      claimCode: 'C',
      claimUrl: 'u',
      claimExpiresAt: new Date().toISOString(),
      note: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('rejects request with missing Authorization header (401)', async () => {
    const app = await appWithJwt();
    const res = await app.inject({
      method: 'POST',
      url: '/transfers/',
      payload: {
        recipientPhone: '+639171234567',
        amount: '10',
        currency: 'USD',
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects request with garbage Bearer token (401)', async () => {
    const app = await appWithJwt();
    const res = await app.inject({
      method: 'POST',
      url: '/transfers/',
      headers: { authorization: 'Bearer not-a-real-jwt' },
      payload: {
        recipientPhone: '+639171234567',
        amount: '10',
        currency: 'USD',
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it('accepts request with valid JWT and passes payload.sub as senderId to TransferService', async () => {
    const app = await appWithJwt();
    const token = app.jwt.sign({ sub: 'usr_abc12345', type: 'access' });

    const res = await app.inject({
      method: 'POST',
      url: '/transfers/',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        recipientPhone: '+639171234567',
        amount: '10',
        currency: 'USD',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(mockCreate).toHaveBeenCalledOnce();
    const arg = mockCreate.mock.calls[0]?.[0] as { senderId: string };
    expect(arg.senderId).toBe('usr_abc12345');
    expect(arg.senderId).not.toBe('usr_development');
  });

  it('rejects refresh tokens used as access tokens (401)', async () => {
    const app = await appWithJwt();
    const refreshToken = app.jwt.sign({
      sub: 'usr_abc12345',
      type: 'refresh',
      jti: 'r1',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/transfers/',
      headers: { authorization: `Bearer ${refreshToken}` },
      payload: {
        recipientPhone: '+639171234567',
        amount: '10',
        currency: 'USD',
      },
    });
    expect(res.statusCode).toBe(401);
  });
});
