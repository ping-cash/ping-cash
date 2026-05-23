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

  // Contract test: every method advertised to PH end-users in claim-service's
  // inferCashoutMethods(+63...) must resolve to at least one adapter here.
  // Drift bug 2026-05-24: web-claim picker offered cebuana-cash-pickup but
  // offramp-service rejected with InvalidMethod (claim-service masked it as
  // status=processing). Add cebuana to TRANSFI_METHOD_MAP + assert here.
  it.each([
    ['gcash'],
    ['maya'],
    ['bdo-bank'],
    ['cebuana-cash-pickup'],
  ])('every PH cashout method advertised to users resolves to an adapter: %s', method => {
    const adapters = selectAdapters(method as never, 'PH');
    expect(adapters.length).toBeGreaterThan(0);
  });
});
