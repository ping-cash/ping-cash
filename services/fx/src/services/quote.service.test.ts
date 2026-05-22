import { describe, it, expect } from 'vitest';
import { FX_SPREAD, ORACLE_DISAGREEMENT_THRESHOLD } from './quote.service';

describe('fx-service constants', () => {
  it('FX_SPREAD is exactly 0.4% (per ADR 0016 — merciful pricing commitment)', () => {
    expect(FX_SPREAD).toBe(0.004);
  });

  it('Oracle disagreement threshold is 0.3% (per ADR 0016)', () => {
    expect(ORACLE_DISAGREEMENT_THRESHOLD).toBe(0.003);
  });
});

describe('fx-service quote math', () => {
  // Validate the spread mechanics with synthetic rates
  it('Applied spread to a USD→PHP conversion correctly', () => {
    const interbank = 56.25; // mid-market PHP/USD
    const expected = interbank * (1 - FX_SPREAD); // 56.025
    expect(Math.abs(expected - 56.025)).toBeLessThan(0.001);
  });

  it('$500 USD at 0.4% spread vs 0% = $2 difference (covered by Ping)', () => {
    const amount = 500;
    const interbankRate = 56.25;
    const pingRate = interbankRate * (1 - FX_SPREAD);
    const userReceives = amount * pingRate;
    const pingAtZeroSpread = amount * interbankRate;
    const difference = pingAtZeroSpread - userReceives;
    // 0.4% of $500 worth in PHP = ~₱112
    expect(Math.abs(difference - 112.5)).toBeLessThan(1);
  });

  it('Real-world comparison: Ping 0.4% vs Western Union 3%', () => {
    const amount = 500;
    const interbankRate = 56.25;
    const userReceivesAtPing = amount * interbankRate * (1 - 0.004);
    const userReceivesAtWU = amount * interbankRate * (1 - 0.03);
    const userSavesVsWU = userReceivesAtPing - userReceivesAtWU;
    // 2.6% delta on $500 worth = ~₱730 saved per transfer
    expect(userSavesVsWU).toBeGreaterThan(700);
  });
});
