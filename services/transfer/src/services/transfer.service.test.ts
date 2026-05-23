import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocks must run before TransferService is imported.
const mockRepoCreate = vi.fn();
const mockMarkAcked = vi.fn();
const mockBridge = vi.fn();
const mockLookupRecipient = vi.fn();
const mockEnsureKyc = vi.fn();
const mockPublishEvent = vi.fn();

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
vi.mock('./claim-bridge.service', () => ({
  createClaimForTransfer: (...args: unknown[]) => mockBridge(...args),
}));
vi.mock('./recipient-lookup.service', () => ({
  lookupRecipientUserId: (...args: unknown[]) => mockLookupRecipient(...args),
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

import { TransferService } from './transfer.service';

const INPUT = {
  senderId: 'usr_1',
  recipientPhone: '+639171234567',
  amount: '25.00',
  currency: 'USD' as const,
};

const transferRecord = (claimCode: string) => ({
  id: 'txn_xyz',
  senderId: 'usr_1',
  recipientPhone: INPUT.recipientPhone,
  recipientPhoneHash: 'hashhash',
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

describe('TransferService.createTransfer eager bridge', () => {
  let svc: TransferService;
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureKyc.mockResolvedValue(undefined);
    mockLookupRecipient.mockResolvedValue(null);
    mockRepoCreate.mockImplementation(async (input: { claimCode: string }) =>
      transferRecord(input.claimCode)
    );
    mockPublishEvent.mockResolvedValue(undefined);
    svc = new TransferService();
  });

  it('marks claim_bridge_acked_at when bridge returns 2xx', async () => {
    mockBridge.mockResolvedValueOnce({ code: 'X', url: 'u' });
    await svc.createTransfer(INPUT);
    expect(mockBridge).toHaveBeenCalledOnce();
    expect(mockMarkAcked).toHaveBeenCalledOnce();
  });

  it('does NOT mark claim_bridge_acked_at when bridge returns null (5xx/network)', async () => {
    mockBridge.mockResolvedValueOnce(null);
    await svc.createTransfer(INPUT);
    expect(mockBridge).toHaveBeenCalledOnce();
    expect(mockMarkAcked).not.toHaveBeenCalled();
  });
});
