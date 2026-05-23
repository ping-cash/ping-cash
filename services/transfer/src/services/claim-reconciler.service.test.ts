import { describe, it, expect, vi, beforeEach } from 'vitest';

const findMany = vi.fn();
const update = vi.fn();
const mockBridge = vi.fn();

vi.mock('../utils/prisma', () => ({
  prisma: {
    transfer: {
      findMany: (...args: unknown[]) => findMany(...args),
      update: (...args: unknown[]) => update(...args),
    },
  },
}));
vi.mock('./claim-bridge.service', () => ({
  createClaimForTransfer: (...args: unknown[]) => mockBridge(...args),
}));

import { tickReconciler } from './claim-reconciler.service';

const baseTransfer = (id: string, claimCode: string) => ({
  id,
  senderId: 'usr_1',
  recipientPhone: '+639171234567',
  claimCode,
  amount: '25.00',
  currency: 'USD',
});

describe('claim-reconciler tickReconciler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zeros when no pending rows', async () => {
    findMany.mockResolvedValueOnce([]);
    const r = await tickReconciler();
    expect(r).toEqual({ found: 0, retried: 0, acked: 0 });
    expect(mockBridge).not.toHaveBeenCalled();
  });

  it('marks acked on bridge 2xx', async () => {
    findMany.mockResolvedValueOnce([baseTransfer('txn_1', 'CODE_ONE12')]);
    mockBridge.mockResolvedValueOnce({ code: 'CODE_ONE12', url: 'u' });
    const r = await tickReconciler();
    expect(r).toEqual({ found: 1, retried: 1, acked: 1 });
    expect(update).toHaveBeenCalledOnce();
  });

  it('retried but not acked on bridge null (5xx/network)', async () => {
    findMany.mockResolvedValueOnce([baseTransfer('txn_2', 'CODE_TWO_2')]);
    mockBridge.mockResolvedValueOnce(null);
    const r = await tickReconciler();
    expect(r).toEqual({ found: 1, retried: 1, acked: 0 });
    expect(update).not.toHaveBeenCalled();
  });

  it('processes a batch of multiple transfers', async () => {
    findMany.mockResolvedValueOnce([
      baseTransfer('txn_a', 'CODE_A_____'),
      baseTransfer('txn_b', 'CODE_B_____'),
      baseTransfer('txn_c', 'CODE_C_____'),
    ]);
    mockBridge
      .mockResolvedValueOnce({ code: 'CODE_A_____', url: 'u' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ code: 'CODE_C_____', url: 'u' });

    const r = await tickReconciler();
    expect(r).toEqual({ found: 3, retried: 3, acked: 2 });
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('query uses createdAt cutoff (within MAX_AGE_MINUTES = 7d)', async () => {
    findMany.mockResolvedValueOnce([]);
    await tickReconciler();
    const callArgs = findMany.mock.calls[0]?.[0] as {
      where: { createdAt: { gte: Date } };
    };
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const cutoff = callArgs.where.createdAt.gte.getTime();
    // Allow ~5s skew
    expect(Math.abs(cutoff - sevenDaysAgo)).toBeLessThan(5000);
  });
});
