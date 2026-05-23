import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  dispatchToOfframp,
  type OfframpBridgeInput,
} from './offramp-bridge.service';

const ORIGINAL = process.env.OFFRAMP_SERVICE_URL;
const INPUT: OfframpBridgeInput = {
  reference: 'PING-ABCD1234',
  method: 'gcash',
  amount: { usdcAmount: '50.00', localAmount: '2812.50', localCurrency: 'PHP' },
  recipient: {
    phone: '+639171234567',
    name: 'Juan dela Cruz',
    accountNumber: '+639171234567',
    accountName: 'Juan dela Cruz',
  },
};

describe('dispatchToOfframp', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (ORIGINAL === undefined) delete process.env.OFFRAMP_SERVICE_URL;
    else process.env.OFFRAMP_SERVICE_URL = ORIGINAL;
  });

  it('returns null when OFFRAMP_SERVICE_URL unset (stub mode)', async () => {
    delete process.env.OFFRAMP_SERVICE_URL;
    const spy = vi.fn(async () => new Response('{}', { status: 200 }));
    const r = await dispatchToOfframp(INPUT, spy as unknown as typeof fetch);
    expect(r).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('POSTs canonical body to /offramp/payout', async () => {
    process.env.OFFRAMP_SERVICE_URL = 'http://offramp:3007';
    let captured: { url: string; body?: unknown } = { url: '' };
    const spy = vi.fn(async (url: string, init?: RequestInit) => {
      captured = {
        url,
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      };
      return new Response(
        JSON.stringify({
          providerName: 'transfi',
          providerReference: 'TF_STUB_xyz',
          status: 'processing',
        }),
        { status: 200 }
      );
    });
    const r = await dispatchToOfframp(INPUT, spy as unknown as typeof fetch);
    expect(captured.url).toBe('http://offramp:3007/offramp/payout');
    expect((captured.body as { reference: string }).reference).toBe(
      'PING-ABCD1234'
    );
    expect(r).toEqual({
      providerName: 'transfi',
      providerReference: 'TF_STUB_xyz',
    });
  });

  it('swallows 5xx — returns null without throwing', async () => {
    process.env.OFFRAMP_SERVICE_URL = 'http://offramp:3007';
    const spy = vi.fn(async () => new Response('boom', { status: 500 }));
    const r = await dispatchToOfframp(INPUT, spy as unknown as typeof fetch);
    expect(r).toBeNull();
  });

  it('swallows network error — returns null without throwing', async () => {
    process.env.OFFRAMP_SERVICE_URL = 'http://offramp:3007';
    const spy = vi.fn(async () => {
      throw new Error('connection refused');
    });
    const r = await dispatchToOfframp(INPUT, spy as unknown as typeof fetch);
    expect(r).toBeNull();
  });
});
