import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { requireKycTier, __resetKycClientForTests } from './kyc-tier';

function makeReply() {
  const captured: { statusCode?: number; body?: unknown } = {};
  const reply: any = {
    statusCode: undefined,
    body: undefined,
  };
  reply.status = (code: number) => {
    captured.statusCode = code;
    reply.statusCode = code;
    return reply;
  };
  reply.send = (body?: unknown) => {
    captured.body = body;
    reply.body = body;
    return reply;
  };
  return reply;
}

describe('requireKycTier middleware', () => {
  const ORIGINAL = process.env.KYC_SERVICE_URL;

  beforeEach(() => {
    vi.restoreAllMocks();
    __resetKycClientForTests();
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.KYC_SERVICE_URL;
    else process.env.KYC_SERVICE_URL = ORIGINAL;
  });

  it('returns 401 when userId missing from context', async () => {
    process.env.KYC_SERVICE_URL = 'http://kyc:3010';
    const mw = requireKycTier(1);
    const reply: any = makeReply();
    await mw({} as any, reply);
    expect(reply.statusCode).toBe(401);
  });

  it('passes through (no reply) when KYC_SERVICE_URL unset (stub mode)', async () => {
    delete process.env.KYC_SERVICE_URL;
    const mw = requireKycTier(1);
    const reply: any = makeReply();
    await mw({ userId: 'u1' } as any, reply);
    expect(reply.statusCode).toBeUndefined();
  });

  it('returns 403 when tier insufficient', async () => {
    process.env.KYC_SERVICE_URL = 'http://kyc:3010';
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ userId: 'u1', kycTier: 0, records: [] }),
            { status: 200 }
          )
      )
    );
    const mw = requireKycTier(2);
    const reply: any = makeReply();
    await mw({ userId: 'u1' } as any, reply);
    expect(reply.statusCode).toBe(403);
    expect((reply.body as any).error.code).toBe('KYC_TIER_INSUFFICIENT');
    expect((reply.body as any).error.details).toEqual({
      currentTier: 0,
      requiredTier: 2,
    });
  });

  it('passes through when tier sufficient', async () => {
    process.env.KYC_SERVICE_URL = 'http://kyc:3010';
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ userId: 'u1', kycTier: 2, records: [] }),
            { status: 200 }
          )
      )
    );
    const mw = requireKycTier(1);
    const reply: any = makeReply();
    await mw({ userId: 'u1' } as any, reply);
    expect(reply.statusCode).toBeUndefined();
  });

  it('returns 503 when kyc-service is down', async () => {
    process.env.KYC_SERVICE_URL = 'http://kyc:3010';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('connection refused');
      })
    );
    const mw = requireKycTier(1);
    const reply: any = makeReply();
    await mw({ userId: 'u1' } as any, reply);
    expect(reply.statusCode).toBe(503);
    expect((reply.body as any).error.code).toBe('KYC_SERVICE_UNAVAILABLE');
  });

  it('reads userId from body when userIdFrom=body', async () => {
    process.env.KYC_SERVICE_URL = 'http://kyc:3010';
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ userId: 'u-from-body', kycTier: 0, records: [] }),
            { status: 200 }
          )
      )
    );
    const mw = requireKycTier(1, { userIdFrom: 'body' });
    const reply: any = makeReply();
    await mw({ body: { userId: 'u-from-body' } } as any, reply);
    expect(reply.statusCode).toBe(403);
  });
});
