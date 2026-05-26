import { describe, it, expect } from 'vitest';

import { selectAdapters } from './router.service';

describe('router.service.selectAdapters', () => {
  it('returns TransFi first for PH GCash', () => {
    const adapters = selectAdapters('gcash', 'PH');
    expect(adapters.length).toBeGreaterThan(0);
    expect(adapters[0].name).toBe('transfi');
  });

  it('returns TransFi first for IN UPI', () => {
    const adapters = selectAdapters('upi', 'IN');
    expect(adapters.length).toBeGreaterThan(0);
    expect(adapters[0].name).toBe('transfi');
  });

  it('returns Wise first for EU SEPA', () => {
    const adapters = selectAdapters('sepa', 'EU');
    expect(adapters[0].name).toBe('wise');
  });

  it('returns Wise first for US ACH', () => {
    const adapters = selectAdapters('us-ach', 'US');
    expect(adapters[0].name).toBe('wise');
  });

  it('returns empty list for unsupported method', () => {
    const adapters = selectAdapters('phpc-direct' as never, 'PH');
    expect(adapters.length).toBe(0); // No adapter supports phpc-direct yet
  });

  // Contract test: every method advertised to end-users in claim-service's
  // inferCashoutMethods(phone) must resolve to at least one adapter here.
  // Drift bug 2026-05-24: web-claim picker offered cebuana-cash-pickup but
  // offramp-service rejected with InvalidMethod (claim-service masked it as
  // status=processing). Same risk for PK bank-transfer + TR turkish-bank.
  it.each([
    ['PH', 'gcash'],
    ['PH', 'maya'],
    ['PH', 'bdo-bank'],
    ['PH', 'cebuana-cash-pickup'],
    ['IN', 'upi'],
    ['IN', 'neft-bank'],
    ['IN', 'paytm'],
    ['PK', 'jazzcash'],
    ['PK', 'easypaisa'],
    ['PK', 'bank-transfer'],
    ['BD', 'bkash'],
    ['BD', 'nagad'],
    ['KE', 'm-pesa'],
    ['KE', 'airtel-money'],
    ['TR', 'turkish-bank'],
  ])(
    'every cashout method advertised to %s users resolves to an adapter: %s',
    (_country, method) => {
      const adapters = selectAdapters(method as never, _country);
      expect(adapters.length).toBeGreaterThan(0);
    }
  );
});
