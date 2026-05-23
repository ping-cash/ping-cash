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
});
