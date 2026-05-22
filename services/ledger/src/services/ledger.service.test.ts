/**
 * Tests for the ledger validation logic (the boundary).
 * Pure unit tests — no DB / Kafka dependency.
 */
import { describe, it, expect } from 'vitest';
import { validateBalanced, type LedgerEntryInput } from './ledger.service';

describe('ledger.service.validateBalanced', () => {
  it('accepts a balanced 2-entry transfer (debit + credit)', () => {
    const entries: LedgerEntryInput[] = [
      {
        accountId: 'a1',
        accountType: 'user_wallet',
        entryType: 'DEBIT',
        amount: '100',
        currency: 'USDC',
      },
      {
        accountId: 'a2',
        accountType: 'user_wallet',
        entryType: 'CREDIT',
        amount: '100',
        currency: 'USDC',
      },
    ];
    expect(() => validateBalanced(entries)).not.toThrow();
  });

  it('accepts a balanced 4-entry transfer-with-fee', () => {
    // Maria sends $100 to Mom; $1.30 fee = $1.20 provider + $0.10 PING markup
    const entries: LedgerEntryInput[] = [
      // Maria's wallet debited $100
      { accountId: 'maria', accountType: 'user_wallet', entryType: 'DEBIT', amount: '100', currency: 'USDC' },
      // Maria's wallet debited $1.20 provider cost
      { accountId: 'maria', accountType: 'user_wallet', entryType: 'DEBIT', amount: '1.20', currency: 'USDC' },
      // Mom's wallet credited $100 (the transfer)
      { accountId: 'mom', accountType: 'user_wallet', entryType: 'CREDIT', amount: '100', currency: 'USDC' },
      // Provider account credited $1.20 (paid out to TransFi)
      { accountId: 'transfi-account', accountType: 'provider_cost', entryType: 'CREDIT', amount: '1.20', currency: 'USDC' },
      // Maria's PING balance debited 10 PING (for 0.10 USD-equivalent markup)
      { accountId: 'maria', accountType: 'user_wallet', entryType: 'DEBIT', amount: '10', currency: 'PING' },
      // Burn address credited 10 PING
      { accountId: 'burn-address', accountType: 'platform_markup', entryType: 'CREDIT', amount: '10', currency: 'PING' },
    ];
    expect(() => validateBalanced(entries)).not.toThrow();
  });

  it('rejects an imbalanced transaction (debit > credit)', () => {
    const entries: LedgerEntryInput[] = [
      { accountId: 'a1', accountType: 'user_wallet', entryType: 'DEBIT', amount: '100', currency: 'USDC' },
      { accountId: 'a2', accountType: 'user_wallet', entryType: 'CREDIT', amount: '99', currency: 'USDC' },
    ];
    expect(() => validateBalanced(entries)).toThrow(/IMBALANCED_TRANSACTION|do not balance/);
  });

  it('rejects an imbalanced transaction (credit > debit)', () => {
    const entries: LedgerEntryInput[] = [
      { accountId: 'a1', accountType: 'user_wallet', entryType: 'DEBIT', amount: '50', currency: 'USDC' },
      { accountId: 'a2', accountType: 'user_wallet', entryType: 'CREDIT', amount: '100', currency: 'USDC' },
    ];
    expect(() => validateBalanced(entries)).toThrow();
  });

  it('rejects when one currency is imbalanced while another is balanced', () => {
    const entries: LedgerEntryInput[] = [
      { accountId: 'a1', accountType: 'user_wallet', entryType: 'DEBIT', amount: '100', currency: 'USDC' },
      { accountId: 'a2', accountType: 'user_wallet', entryType: 'CREDIT', amount: '100', currency: 'USDC' },
      { accountId: 'a3', accountType: 'user_wallet', entryType: 'DEBIT', amount: '10', currency: 'PING' },
      // PING credit missing → imbalanced
    ];
    expect(() => validateBalanced(entries)).toThrow();
  });

  it('handles decimal precision correctly', () => {
    const entries: LedgerEntryInput[] = [
      { accountId: 'a1', accountType: 'user_wallet', entryType: 'DEBIT', amount: '0.00000001', currency: 'USDC' },
      { accountId: 'a2', accountType: 'user_wallet', entryType: 'CREDIT', amount: '0.00000001', currency: 'USDC' },
    ];
    expect(() => validateBalanced(entries)).not.toThrow();
  });
});
