import { describe, it, expect } from 'vitest';
import { requiredTierForAmount } from './kyc-check.service';

describe('requiredTierForAmount', () => {
  it('returns 0 for amounts < $200', () => {
    expect(requiredTierForAmount(0)).toBe(0);
    expect(requiredTierForAmount(50)).toBe(0);
    expect(requiredTierForAmount(199.99)).toBe(0);
  });

  it('returns 1 for amounts $200 - $999.99', () => {
    expect(requiredTierForAmount(200)).toBe(1);
    expect(requiredTierForAmount(500)).toBe(1);
    expect(requiredTierForAmount(999.99)).toBe(1);
  });

  it('returns 2 for amounts >= $1000', () => {
    expect(requiredTierForAmount(1000)).toBe(2);
    expect(requiredTierForAmount(10_000)).toBe(2);
  });
});
