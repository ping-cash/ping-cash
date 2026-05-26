/**
 * Vitest for #58 — Wise adapter real 3-call flow.
 *
 * AC branches covered:
 *   1. Stub mode  — no API key → synthetic WS_STUB_* response
 *   2. Happy path — quote 200 + recipient 200 + transfer 200 + fund 200
 *   3. Recipient-create-failure — quote 200 + recipient 400 → PayoutFailed
 *   4. Transfer-failure         — quote 200 + recipient 200 + transfer 422 → PayoutFailed
 *   5. Webhook signature verify — HMAC-SHA256 round-trip + tampering rejection
 */
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

// Mock @ping/config BEFORE importing the adapter so loadConfig returns
// a deterministic shape with API key + profile set. Tests then flip the
// mock for the stub-mode case.
vi.mock('@ping/config', () => ({
  loadConfig: () => ({
    WISE_API_KEY: 'test-wise-key',
    WISE_PROFILE_ID: '12345',
    WISE_API_BASE_URL: 'https://api.test.wise',
    WISE_WEBHOOK_SECRET: 'test-webhook-secret',
  }),
}));

// Mock logger to silence test noise.
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import type { PayoutRequest } from './types';
import { wiseAdapter } from './wise.adapter';

const baseRequest: PayoutRequest = {
  reference: 'PING-WS-TEST',
  method: 'sepa',
  amount: {
    usdcAmount: '100.00',
    localAmount: '92.50',
    localCurrency: 'EUR',
  },
  recipient: {
    name: 'Alice Recipient',
    accountName: 'Alice Recipient',
    accountNumber: 'DE89370400440532013000',
  },
};

function mockFetchSequence(responses: Array<Partial<Response>>): Mock {
  const fetchMock = vi.fn();
  for (const r of responses) {
    fetchMock.mockResolvedValueOnce({
      ok: r.ok ?? true,
      status: r.status ?? 200,
      text: async () => (r as { _text?: string })._text ?? '',
      json: async () => (r as { _json?: unknown })._json ?? {},
    } as Response);
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('wiseAdapter.supports', () => {
  it('claims EUR + GBP + USD bank methods', () => {
    expect(wiseAdapter.supports('sepa', 'DE')).toBe(true);
    expect(wiseAdapter.supports('sepa-instant', 'DE')).toBe(true);
    expect(wiseAdapter.supports('uk-faster-payments', 'GB')).toBe(true);
    expect(wiseAdapter.supports('us-ach', 'US')).toBe(true);
    expect(wiseAdapter.supports('us-wire', 'US')).toBe(true);
  });

  it('rejects mobile-wallet methods', () => {
    expect(wiseAdapter.supports('gcash', 'PH')).toBe(false);
    expect(wiseAdapter.supports('m-pesa', 'KE')).toBe(false);
    expect(wiseAdapter.supports('bkash', 'BD')).toBe(false);
  });
});

describe('wiseAdapter.payout — real 3-call flow', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('happy path: quote + recipient + transfer + fund all succeed', async () => {
    const fetchMock = mockFetchSequence([
      // 1. Quote
      { ok: true, status: 200, _json: { id: 'quote-uuid-1', rate: 0.925, paymentOptions: [] } },
      // 2. Recipient
      { ok: true, status: 200, _json: { id: 9001, currency: 'EUR', type: 'iban', accountHolderName: 'Alice Recipient' } },
      // 3. Transfer
      { ok: true, status: 201, _json: { id: 77001, status: 'incoming_payment_waiting', customerTransactionId: 'PING-WS-TEST' } },
      // 4. Fund
      { ok: true, status: 201, _json: { type: 'BALANCE' } },
    ]);

    const result = await wiseAdapter.payout(baseRequest);

    expect(result.providerName).toBe('wise');
    expect(result.providerReference).toBe('77001');
    expect(result.status).toBe('pending'); // incoming_payment_waiting maps to pending
    expect(result.metadata).toMatchObject({ quoteId: 'quote-uuid-1', accountId: 9001 });
    expect(fetchMock).toHaveBeenCalledTimes(4);

    const [quoteUrl, quoteOpts] = fetchMock.mock.calls[0];
    expect(quoteUrl).toBe('https://api.test.wise/v3/profiles/12345/quotes');
    expect(quoteOpts.method).toBe('POST');
    expect(JSON.parse(quoteOpts.body as string)).toMatchObject({
      sourceCurrency: 'USD',
      targetCurrency: 'EUR',
      targetAmount: 92.5,
      payOut: 'BANK_TRANSFER',
    });

    const [accountUrl, accountOpts] = fetchMock.mock.calls[1];
    expect(accountUrl).toBe('https://api.test.wise/v1/accounts');
    expect(JSON.parse(accountOpts.body as string)).toMatchObject({
      currency: 'EUR',
      type: 'iban',
      profile: 12345,
      accountHolderName: 'Alice Recipient',
      legalType: 'PRIVATE',
      details: { IBAN: 'DE89370400440532013000' },
    });

    const [transferUrl, transferOpts] = fetchMock.mock.calls[2];
    expect(transferUrl).toBe('https://api.test.wise/v1/transfers');
    expect(JSON.parse(transferOpts.body as string)).toMatchObject({
      targetAccount: 9001,
      quoteUuid: 'quote-uuid-1',
      customerTransactionId: 'PING-WS-TEST',
    });

    const [fundUrl, fundOpts] = fetchMock.mock.calls[3];
    expect(fundUrl).toBe('https://api.test.wise/v3/profiles/12345/transfers/77001/payments');
    expect(JSON.parse(fundOpts.body as string)).toEqual({ type: 'BALANCE' });
  });

  it('recipient-create-failure: quote 200, recipient 400 → throws PayoutFailed', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, status: 200, _json: { id: 'quote-uuid-2', rate: 0.925, paymentOptions: [] } },
      { ok: false, status: 400, _text: 'Bad IBAN' },
    ]);

    await expect(wiseAdapter.payout(baseRequest)).rejects.toMatchObject({
      code: 'PAYOUT_FAILED',
      details: { provider: 'wise', step: 'recipient', status: 400 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2); // Stops at recipient — never reaches transfer/fund
  });

  it('transfer-failure: quote 200, recipient 200, transfer 422 → throws PayoutFailed', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, status: 200, _json: { id: 'quote-uuid-3', rate: 0.925, paymentOptions: [] } },
      { ok: true, status: 200, _json: { id: 9002, currency: 'EUR', type: 'iban', accountHolderName: 'Alice Recipient' } },
      { ok: false, status: 422, _text: 'Insufficient balance' },
    ]);

    await expect(wiseAdapter.payout(baseRequest)).rejects.toMatchObject({
      code: 'PAYOUT_FAILED',
      details: { provider: 'wise', step: 'transfer', status: 422 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3); // Stops at transfer — never reaches fund
  });

  it('quote-failure: quote 500 → throws PayoutFailed', async () => {
    const fetchMock = mockFetchSequence([
      { ok: false, status: 500, _text: 'Wise upstream down' },
    ]);

    await expect(wiseAdapter.payout(baseRequest)).rejects.toMatchObject({
      code: 'PAYOUT_FAILED',
      details: { provider: 'wise', step: 'quote', status: 500 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fund-step soft-fails: transfer succeeded so adapter still returns processing', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, status: 200, _json: { id: 'quote-uuid-4', rate: 1.0, paymentOptions: [] } },
      { ok: true, status: 200, _json: { id: 9003, currency: 'USD', type: 'aba', accountHolderName: 'Alice' } },
      { ok: true, status: 201, _json: { id: 77002, status: 'incoming_payment_waiting', customerTransactionId: 'PING-WS-TEST' } },
      { ok: false, status: 400, _text: 'BALANCE not funded' },
    ]);

    const result = await wiseAdapter.payout({
      ...baseRequest,
      method: 'us-ach',
      amount: { ...baseRequest.amount, localCurrency: 'USD', localAmount: '100.00' },
      recipient: {
        ...baseRequest.recipient,
        bankCode: '021000021',
        accountNumber: '12345678',
      },
    });

    expect(result.providerReference).toBe('77002');
    expect(result.status).toBe('pending');
    expect(fetchMock).toHaveBeenCalledTimes(4); // Fund still called even though it failed
  });

  it('GBP path: builds sort_code details', async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, status: 200, _json: { id: 'quote-uuid-5', rate: 0.8, paymentOptions: [] } },
      { ok: true, status: 200, _json: { id: 9004, currency: 'GBP', type: 'sort_code', accountHolderName: 'Bob' } },
      { ok: true, status: 201, _json: { id: 77003, status: 'incoming_payment_waiting', customerTransactionId: 'PING-WS-TEST' } },
      { ok: true, status: 201, _json: {} },
    ]);

    await wiseAdapter.payout({
      ...baseRequest,
      method: 'uk-faster-payments',
      amount: { usdcAmount: '100.00', localAmount: '80.00', localCurrency: 'GBP' },
      recipient: { name: 'Bob', accountName: 'Bob', accountNumber: '12345678', bankCode: '20-00-00' },
    });

    const [, accountOpts] = fetchMock.mock.calls[1];
    const accountBody = JSON.parse(accountOpts.body as string);
    expect(accountBody.currency).toBe('GBP');
    expect(accountBody.type).toBe('sort_code');
    expect(accountBody.details).toMatchObject({
      sortCode: '20-00-00',
      accountNumber: '12345678',
    });
  });
});

describe('wiseAdapter — stub mode (no API key OR no profile)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns synthetic response when both API key + profile absent', async () => {
    // Flip the module's config-loader cache to undefined env.
    vi.doMock('@ping/config', () => ({
      loadConfig: () => ({
        WISE_API_KEY: undefined,
        WISE_PROFILE_ID: undefined,
        WISE_API_BASE_URL: 'https://api.test.wise',
        WISE_WEBHOOK_SECRET: undefined,
      }),
    }));
    // Re-import the adapter against the new mock.
    const { wiseAdapter: stubAdapter } = await import('./wise.adapter?stub-test');

    const result = await stubAdapter.payout(baseRequest);
    expect(result.providerName).toBe('wise');
    expect(result.providerReference).toMatch(/^WS_STUB_\d+$/);
    expect(result.status).toBe('processing');
    expect(result.metadata).toEqual({ stub: true });
  });
});

describe('wiseAdapter.verifyWebhook', () => {
  it('returns true on correct HMAC-SHA256', async () => {
    const { createHmac } = await import('node:crypto');
    const payload = '{"data":{"resource":{"id":77001},"current_state":"outgoing_payment_sent"}}';
    const sig = createHmac('sha256', 'test-webhook-secret').update(payload).digest('hex');
    expect(wiseAdapter.verifyWebhook(payload, sig)).toBe(true);
  });

  it('returns false on tampered signature', () => {
    const payload = '{"data":{"resource":{"id":77001},"current_state":"outgoing_payment_sent"}}';
    const wrongSig = 'a'.repeat(64);
    expect(wiseAdapter.verifyWebhook(payload, wrongSig)).toBe(false);
  });

  it('returns false on length-mismatched signature', () => {
    expect(wiseAdapter.verifyWebhook('payload', 'short')).toBe(false);
  });
});

describe('wiseAdapter.parseWebhook', () => {
  it('parses v3 webhook shape with data.resource.id', () => {
    const result = wiseAdapter.parseWebhook(
      '{"data":{"resource":{"id":77001,"type":"transfer"},"current_state":"outgoing_payment_sent","occurred_at":"2026-05-27T12:00:00Z"}}'
    );
    expect(result.reference).toBe('77001');
    expect(result.status).toBe('completed');
    expect(result.metadata).toMatchObject({ transferId: 77001 });
  });

  it('parses legacy v1 webhook shape', () => {
    const result = wiseAdapter.parseWebhook(
      '{"reference":"PING-WS-TEST","current_state":"funds_refunded"}'
    );
    expect(result.reference).toBe('PING-WS-TEST');
    expect(result.status).toBe('failed');
  });

  it('maps unknown states to pending', () => {
    const result = wiseAdapter.parseWebhook(
      '{"data":{"resource":{"id":77001},"current_state":"some_new_state_we_dont_know"}}'
    );
    expect(result.status).toBe('pending');
  });
});
