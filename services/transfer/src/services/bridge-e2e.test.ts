import { describe, it, expect, beforeEach, vi } from 'vitest';

// One end-to-end test that covers the eager path + the reconciler retry.
// All external surfaces (DB, claim-service, user-service, KYC, Kafka) are mocked
// so the test is fast + deterministic and locks the integration contract.

const mockRepoCreate = vi.fn();
const mockMarkAcked = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();
const mockBridgeFetch = vi.fn();
const mockLookupFetch = vi.fn();
const mockPublishEvent = vi.fn();
const mockEnsureKyc = vi.fn();

vi.mock('../repositories/transfer.repository', () => ({
  TransferRepository: class {
    create = mockRepoCreate;
    markClaimBridgeAcked = mockMarkAcked;
    findById = vi.fn();
    findByUser = vi.fn();
    updateStatus = vi.fn();
    update = vi.fn();
  },
}));
vi.mock('../utils/prisma', () => ({
  prisma: {
    transfer: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));
vi.mock('./kyc-check.service', () => ({
  ensureKycForTransfer: (...args: unknown[]) => mockEnsureKyc(...args),
  KycTierInsufficientError: class extends Error {
    constructor(
      public currentTier: number,
      public requiredTier: number
    ) {
      super('kyc');
    }
  },
}));
vi.mock('../events/producer', () => ({
  publishEvent: (...args: unknown[]) => mockPublishEvent(...args),
}));

import { tickReconciler } from './claim-reconciler.service';
import { TransferService } from './transfer.service';

const INPUT = {
  senderId: 'usr_1',
  recipientPhone: '+639171234567',
  amount: '25.00',
  currency: 'USD' as const,
};

const transferRecord = (claimCode: string) => ({
  id: 'txn_e2e',
  senderId: 'usr_1',
  recipientPhone: INPUT.recipientPhone,
  recipientPhoneHash: 'h',
  amount: { amount: '25.00', currency: 'USD' },
  fees: { amount: '0.00', currency: 'USD' },
  status: 'pending',
  claimCode,
  claimUrl: 'http://localhost/c/' + claimCode,
  claimExpiresAt: new Date().toISOString(),
  note: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('bridge-e2e: eager-path + reconciler', () => {
  let svc: TransferService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureKyc.mockResolvedValue(undefined);
    mockRepoCreate.mockImplementation(async (input: { claimCode: string }) =>
      transferRecord(input.claimCode)
    );
    mockPublishEvent.mockResolvedValue(undefined);
    process.env.CLAIM_SERVICE_URL = 'http://claim:3006';
    delete process.env.USER_SERVICE_URL;
    vi.stubGlobal('fetch', (url: string, _init?: RequestInit) => {
      if (url.includes('/claims/internal/create')) return mockBridgeFetch();
      if (url.includes('/users/internal/by-phone-hash'))
        return mockLookupFetch();
      throw new Error(`unexpected fetch: ${url}`);
    });
    svc = new TransferService();
  });

  it('eager path: bridge 2xx → markClaimBridgeAcked called', async () => {
    mockBridgeFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'CODE', url: 'u' }), { status: 201 })
    );
    await svc.createTransfer(INPUT);
    expect(mockMarkAcked).toHaveBeenCalledOnce();
  });

  it('retry path: bridge 5xx → markClaimBridgeAcked NOT called → reconciler tick acks it', async () => {
    mockBridgeFetch.mockResolvedValueOnce(
      new Response('boom', { status: 503 })
    );
    await svc.createTransfer(INPUT);
    expect(mockMarkAcked).not.toHaveBeenCalled();

    // Reconciler tick: pretend DB returns the same transfer; bridge succeeds this time.
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'txn_e2e',
        senderId: 'usr_1',
        recipientPhone: INPUT.recipientPhone,
        claimCode: 'CODE',
        amount: '25.00',
        currency: 'USD',
      },
    ]);
    mockBridgeFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 'CODE', url: 'u' }), { status: 201 })
    );
    const r = await tickReconciler();
    expect(r.acked).toBe(1);
    expect(mockUpdate).toHaveBeenCalledOnce();
  });
});
