/**
 * Unit tests for oracle.service.ts — stub rate fallback + currency
 * support + cross-check shape.
 */
import { describe, it, expect } from 'vitest';

import { crossCheckSwitchboard, getPythRate } from './oracle.service';

describe('getPythRate (stub mode)', () => {
  it('returns USD/PHP stub rate ≈ 56.25', async () => {
    const q = await getPythRate('PHP');
    expect(q.pair).toBe('USD/PHP');
    expect(q.rate).toBeGreaterThan(40);
    expect(q.rate).toBeLessThan(75);
    expect(q.source).toBe('stub');
  });

  it('returns USD/INR stub rate ≈ 83', async () => {
    const q = await getPythRate('INR');
    expect(q.rate).toBeGreaterThan(70);
    expect(q.rate).toBeLessThan(95);
  });

  it('returns USD/PKR stub rate ≈ 278', async () => {
    const q = await getPythRate('PKR');
    expect(q.rate).toBeGreaterThan(200);
  });

  it('lowercase currency works (normalized to uppercase)', async () => {
    const q = await getPythRate('eur');
    expect(q.pair).toBe('USD/EUR');
  });

  it('throws on unsupported currency', async () => {
    await expect(getPythRate('XYZ')).rejects.toThrow('Unsupported currency');
  });

  it('publishTime is a fresh unix timestamp', async () => {
    const before = Math.floor(Date.now() / 1000);
    const q = await getPythRate('TRY');
    const after = Math.floor(Date.now() / 1000);
    expect(q.publishTime).toBeGreaterThanOrEqual(before);
    expect(q.publishTime).toBeLessThanOrEqual(after + 1);
  });
});

describe('crossCheckSwitchboard (Phase 1 stub)', () => {
  it('always agrees with the same rate (Phase 1 stub)', async () => {
    const r = await crossCheckSwitchboard({
      pair: 'USD/PHP',
      rate: 56.25,
      publishTime: 0,
      source: 'stub',
    });
    expect(r.agrees).toBe(true);
    expect(r.switchboardRate).toBe(56.25);
  });
});
