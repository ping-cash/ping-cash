import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-claim-service e2e for #57: verifies executeCashout calls dispatchToOfframp
// with the correct body shape derived from the persisted claim record.

const store = new Map<string, any>();
const offrampSpy = vi.fn();

vi.mock('../utils/redis', () => ({
  storeClaim: async (code: string, record: any) => {
    store.set(code, record);
  },
  readClaim: async (code: string) => store.get(code) ?? null,
  updateClaim: async (code: string, updates: any) => {
    const cur = store.get(code);
    if (!cur) return null;
    const next = { ...cur, ...updates };
    store.set(code, next);
    return next;
  },
  storeRateLimit: async () => {},
  checkClaimViewRateLimit: async () => true,
  checkOtpRateLimit: async () => ({ allowed: true, remaining: 5 }),
  CLAIM_TTL_SECONDS: 7 * 24 * 60 * 60,
}));

vi.mock('./offramp-bridge.service', () => ({
  dispatchToOfframp: (...args: unknown[]) => offrampSpy(...args),
}));

vi.mock('./twilio.service', () => ({
  sendClaimOtp: async () => ({
    sent: true,
    attemptsRemaining: 4,
    expiresIn: 600,
  }),
  verifyClaimOtp: async () => true,
}));

import * as claimService from './claim.service';

const BASE = {
  transferId: 'txn_e2e_1',
  senderId: 'usr_e2e_sender',
  senderName: 'Test Sender',
  recipientPhone: '+639171234567',
  amount: {
    value: '50.00',
    currency: 'USDC',
    localValue: '2812.50',
    localCurrency: 'PHP',
    fxRate: 56.25,
  },
};

describe('claim → offramp bridge integration', () => {
  beforeEach(() => {
    store.clear();
    offrampSpy.mockReset();
    offrampSpy.mockResolvedValue({
      providerName: 'transfi',
      providerReference: 'TF_STUB_123',
    });
  });

  it('full cashout flow: create → otp → verify → cashout fires bridge with correct shape', async () => {
    const created = await claimService.create(BASE);
    expect(created.code).toBeTruthy();
    expect(offrampSpy).not.toHaveBeenCalled();

    await claimService.requestOtp(created.code, '127.0.0.1');
    await claimService.verifyOtp(created.code, '123456');

    const result = await claimService.executeCashout({
      code: created.code,
      method: 'gcash',
      account: '+639171234567',
      accountName: 'Juan dela Cruz',
    });
    expect(result.status).toBe('processing');
    expect(result.offrampReference).toMatch(/^PING-[A-F0-9]{8}$/);

    expect(offrampSpy).toHaveBeenCalledOnce();
    const arg = offrampSpy.mock.calls[0]?.[0] as {
      reference: string;
      method: string;
      amount: {
        usdcAmount: string;
        localAmount: string;
        localCurrency: string;
      };
      recipient: { phone?: string; accountName?: string };
    };
    expect(arg.reference).toBe(result.offrampReference);
    expect(arg.method).toBe('gcash');
    expect(arg.amount.usdcAmount).toBe('50.00');
    expect(arg.amount.localAmount).toBe('2812.50');
    expect(arg.amount.localCurrency).toBe('PHP');
    expect(arg.recipient.phone).toBe('+639171234567');
    expect(arg.recipient.accountName).toBe('Juan dela Cruz');
  });

  it('cashout still returns processing even if offramp bridge returns null', async () => {
    offrampSpy.mockResolvedValueOnce(null);
    const created = await claimService.create({
      ...BASE,
      transferId: 'txn_e2e_2',
    });
    await claimService.requestOtp(created.code, '127.0.0.1');
    await claimService.verifyOtp(created.code, '123456');
    const result = await claimService.executeCashout({
      code: created.code,
      method: 'maya',
      account: '+639281234567',
      accountName: 'Maria',
    });
    expect(result.status).toBe('processing');
    expect(result.offrampReference).toBeTruthy();
  });
});
