/**
 * FX quote service.
 *
 * Per ADR 0016 (FX cost-covering pricing):
 *   - User-facing spread: 0.4% (fixed, brand commitment)
 *   - Real cost: 0.2-0.4% (covered)
 *   - Ping margin: 0.0-0.2% (razor-thin, never negative)
 *   - Hard floor: never settle below provider cost
 */
import { logger } from '../utils/logger';

import { getPythRate, crossCheckSwitchboard } from './oracle.service';

// Per ADR 0016 — the brand commitment
export const FX_SPREAD = 0.004; // 0.4%

// Per ADR 0016 — agreement tolerance between oracles
export const ORACLE_DISAGREEMENT_THRESHOLD = 0.003; // 0.3%

export interface FxQuote {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  interbankRate: number;
  pingRate: number;
  spread: number; // 0.004
  receivedAmount: string;
  validUntil: number; // unix timestamp
  oracleSource: 'pyth' | 'pyth+switchboard' | 'stub';
}

/**
 * Get a quote for converting `fromCurrency` to `toCurrency`.
 *
 * Currently only USD → <local-currency> is supported. For reverse direction,
 * the rate is 1/rate but the spread still applies.
 */
export async function getQuote(
  amount: string,
  fromCurrency: string,
  toCurrency: string
): Promise<FxQuote> {
  const amountNum = parseFloat(amount);
  if (Number.isNaN(amountNum) || amountNum <= 0) {
    throw new Error('Invalid amount');
  }

  // Get oracle rate
  if (fromCurrency.toUpperCase() === 'USD') {
    const pythQuote = await getPythRate(toCurrency);

    // Cross-check with Switchboard
    const crossCheck = await crossCheckSwitchboard(pythQuote);
    if (!crossCheck.agrees) {
      logger.warn(
        {
          pythRate: pythQuote.rate,
          switchboardRate: crossCheck.switchboardRate,
        },
        'Oracle disagreement — rejecting quote'
      );
      throw new Error(
        'FX oracle disagreement exceeds 0.3% threshold — quote rejected'
      );
    }

    const interbankRate = pythQuote.rate;
    const pingRate = interbankRate * (1 - FX_SPREAD);
    const receivedAmount = (amountNum * pingRate).toFixed(2);

    return {
      id: `quote_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
      fromCurrency: 'USD',
      toCurrency: toCurrency.toUpperCase(),
      amount,
      interbankRate,
      pingRate,
      spread: FX_SPREAD,
      receivedAmount,
      validUntil: Math.floor(Date.now() / 1000) + 60, // 60s validity
      oracleSource: pythQuote.source === 'stub' ? 'stub' : 'pyth+switchboard',
    };
  }

  // Reverse direction
  if (toCurrency.toUpperCase() === 'USD') {
    const pythQuote = await getPythRate(fromCurrency);
    const crossCheck = await crossCheckSwitchboard(pythQuote);
    if (!crossCheck.agrees) {
      throw new Error('FX oracle disagreement — quote rejected');
    }
    const interbankRate = 1 / pythQuote.rate;
    const pingRate = interbankRate * (1 - FX_SPREAD);
    const receivedAmount = (amountNum * pingRate).toFixed(2);

    return {
      id: `quote_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: 'USD',
      amount,
      interbankRate,
      pingRate,
      spread: FX_SPREAD,
      receivedAmount,
      validUntil: Math.floor(Date.now() / 1000) + 60,
      oracleSource: pythQuote.source === 'stub' ? 'stub' : 'pyth+switchboard',
    };
  }

  throw new Error('Only USD pairs supported in Phase 1 (USD ↔ any)');
}

/**
 * Get raw rate for a currency (no spread applied).
 * Used internally by other services that need the mid-market rate.
 */
export async function getRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency.toUpperCase() === 'USD') {
    const q = await getPythRate(toCurrency);
    return q.rate;
  }
  if (toCurrency.toUpperCase() === 'USD') {
    const q = await getPythRate(fromCurrency);
    return 1 / q.rate;
  }
  throw new Error('Only USD pairs supported');
}
