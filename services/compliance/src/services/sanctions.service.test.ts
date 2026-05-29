/**
 * Unit tests for sanctions.service.ts — stub mode behavior + early-return
 * shapes. Real Chainalysis path requires network so we only exercise
 * stub paths here.
 */
import { describe, it, expect, vi } from 'vitest';

import { checkTransferAllowance, screenName } from './sanctions.service';

vi.mock('./ofac-screener.service', () => ({
  screenAddressAgainstSdn: vi
    .fn()
    .mockResolvedValue({ matched: false, source: 'ofac-direct', checkedAt: 0 }),
}));

describe('screenName (stub)', () => {
  it('flags fullName containing "sanctioned-test" as hit', async () => {
    const r = await screenName({ fullName: 'Random Sanctioned-Test Person' });
    expect(r.result).toBe('hit');
    expect(r.listsHit).toContain('OFAC_SDN_STUB');
    expect(r.riskScore).toBeGreaterThan(80);
  });

  it('returns clean for a normal-looking name', async () => {
    const r = await screenName({ fullName: 'Jane Doe' });
    expect(r.result).toBe('clean');
    expect(r.listsHit).toEqual([]);
  });
});

describe('checkTransferAllowance (stub mode)', () => {
  it('allows a normal transfer between clean wallets', async () => {
    const r = await checkTransferAllowance({
      senderWallet: 'CleanSender1111111111111111111111111111111111',
      recipientWallet: 'CleanRecipient111111111111111111111111111111',
      amountUsdc: '50.00',
    });
    expect(r.allowed).toBe(true);
    expect(r.walletScreenings.length).toBeGreaterThanOrEqual(1);
  });

  it('blocks when sender wallet starts with "Sanctioned"', async () => {
    const r = await checkTransferAllowance({
      senderWallet: 'SanctionedSender111111111111111111111111111111',
      amountUsdc: '50.00',
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/Sender wallet sanctioned/);
  });

  it('blocks when recipient wallet starts with "Sanctioned"', async () => {
    const r = await checkTransferAllowance({
      senderWallet: 'CleanSender1111111111111111111111111111111111',
      recipientWallet: 'SanctionedRcpt111111111111111111111111111111',
      amountUsdc: '50.00',
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/Recipient wallet sanctioned/);
  });

  it('blocks recipient by name when amount exceeds $1000 + name flagged', async () => {
    const r = await checkTransferAllowance({
      senderWallet: 'CleanSender1111111111111111111111111111111111',
      recipientWallet: 'CleanRecipient111111111111111111111111111111',
      recipientName: 'Bad Sanctioned-Test',
      amountUsdc: '1500.00',
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/Recipient name sanctioned/);
  });
});
