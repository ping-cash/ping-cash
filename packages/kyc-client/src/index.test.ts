import { describe, it, expect } from 'vitest';
import { KycClient, KycClientError } from './index';

function stubFetch(
  handler: (url: string, init?: RequestInit) => Response
): typeof fetch {
  return (async (url, init) =>
    handler(url.toString(), init as RequestInit)) as typeof fetch;
}

describe('KycClient', () => {
  it('initTier1 POSTs and returns inquiryId', async () => {
    let captured: { url: string; body?: unknown } = { url: '' };
    const client = new KycClient({
      baseUrl: 'http://kyc:3010',
      fetchImpl: stubFetch((url, init) => {
        captured = {
          url,
          body: init?.body ? JSON.parse(init.body as string) : undefined,
        };
        return new Response(
          JSON.stringify({
            inquiryId: 'persona_stub_x',
            redirectUrl: 'http://stub',
          }),
          { status: 202 }
        );
      }),
    });
    const r = await client.initTier1({
      userId: '00000000-0000-0000-0000-000000000001',
      phone: '+447700900111',
      country: 'GBR',
    });
    expect(captured.url).toBe('http://kyc:3010/kyc/tier1/init');
    expect(r.inquiryId).toBe('persona_stub_x');
  });

  it('getState GETs and returns KycState', async () => {
    const client = new KycClient({
      baseUrl: 'http://kyc:3010',
      fetchImpl: stubFetch(
        () =>
          new Response(
            JSON.stringify({ userId: 'u', kycTier: 1, records: [] }),
            { status: 200 }
          )
      ),
    });
    const s = await client.getState('u');
    expect(s.kycTier).toBe(1);
  });

  it('throws KycClientError on non-2xx', async () => {
    const client = new KycClient({
      baseUrl: 'http://kyc:3010',
      fetchImpl: stubFetch(() => new Response('not found', { status: 404 })),
    });
    await expect(client.getState('missing')).rejects.toBeInstanceOf(
      KycClientError
    );
  });

  it('attaches Bearer authorization when serviceToken set', async () => {
    let auth: string | undefined;
    const client = new KycClient({
      baseUrl: 'http://kyc:3010',
      serviceToken: 'svc.jwt.tok',
      fetchImpl: stubFetch((_url, init) => {
        const headers = init?.headers as Record<string, string> | undefined;
        auth = headers?.authorization;
        return new Response(
          JSON.stringify({ userId: 'u', kycTier: 0, records: [] }),
          { status: 200 }
        );
      }),
    });
    await client.getState('u');
    expect(auth).toBe('Bearer svc.jwt.tok');
  });
});
