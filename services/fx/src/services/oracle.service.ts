/**
 * Pyth + Switchboard oracle integration.
 *
 * Per ADR 0016 (FX cost-covering pricing):
 *   - Pyth is the primary oracle for USD/<local-currency>
 *   - Switchboard is the secondary cross-check
 *   - If oracles disagree by more than 0.3%, the quote is rejected
 */
import { PriceServiceConnection } from '@pythnetwork/price-service-client';
import { logger } from '../utils/logger';

// Pyth price feed IDs (Hermes mainnet)
// https://pyth.network/developers/price-feed-ids
const PYTH_PRICE_FEEDS: Record<string, string> = {
  // Currency-to-USD feeds; we invert to get USD-to-local
  USD_PHP: '0xa8b3da1d8d80f5b1e7e9a8b7c7f7f1e1d1c1b1a1908070605040302010000ff', // placeholder; real IDs in production config
  USD_INR: '0x...',
  USD_PKR: '0x...',
  USD_BDT: '0x...',
  USD_KES: '0x...',
  USD_NGN: '0x...',
  USD_EUR: '0x...',
  USD_GBP: '0x...',
  USD_AED: '0x...',
  USD_TRY: '0x...',
};

const PRICE_SERVICE_ENDPOINT =
  process.env.PYTH_HERMES_URL ?? 'https://hermes.pyth.network';

let _client: PriceServiceConnection | null = null;
function getClient(): PriceServiceConnection {
  if (_client) return _client;
  _client = new PriceServiceConnection(PRICE_SERVICE_ENDPOINT);
  return _client;
}

export interface OracleQuote {
  pair: string; // e.g., "USD/PHP"
  rate: number;
  publishTime: number;
  source: 'pyth' | 'switchboard' | 'stub';
}

/**
 * Get the live USD/<local-currency> rate from Pyth.
 * Returns a stub rate if oracle isn't configured (dev/test).
 */
export async function getPythRate(currency: string): Promise<OracleQuote> {
  const feedKey = `USD_${currency.toUpperCase()}`;
  const feedId = PYTH_PRICE_FEEDS[feedKey];

  if (!feedId || feedId.startsWith('0x...') || feedId.startsWith('0xa8b3da')) {
    // Stub rates for dev/test (matches BUSINESS-STRATEGY.md approximations)
    const STUB_RATES: Record<string, number> = {
      PHP: 56.25,
      INR: 83.0,
      PKR: 278.0,
      BDT: 110.0,
      KES: 130.0,
      NGN: 1550.0,
      EUR: 0.92,
      GBP: 0.78,
      AED: 3.673,
      TRY: 32.5,
    };
    const rate = STUB_RATES[currency.toUpperCase()];
    if (!rate) {
      throw new Error(`Unsupported currency: ${currency}`);
    }
    logger.info({ currency, rate }, '[STUB MODE] Pyth oracle');
    return {
      pair: `USD/${currency.toUpperCase()}`,
      rate,
      publishTime: Math.floor(Date.now() / 1000),
      source: 'stub',
    };
  }

  try {
    const updates = await getClient().getLatestPriceFeeds([feedId]);
    if (!updates || updates.length === 0) {
      throw new Error(`No price feed found for USD/${currency}`);
    }
    const priceFeed = updates[0];
    const price = priceFeed.getPriceUnchecked();
    const rate = Number(price.price) * Math.pow(10, price.expo);

    return {
      pair: `USD/${currency.toUpperCase()}`,
      rate,
      publishTime: price.publishTime,
      source: 'pyth',
    };
  } catch (err) {
    logger.error({ err, currency }, 'Pyth oracle lookup failed');
    throw err;
  }
}

/**
 * Cross-check Pyth quote against Switchboard.
 *
 * Returns true if the two oracles agree within 0.3%.
 * Phase 1 stub: always passes (no Switchboard integration yet).
 */
export async function crossCheckSwitchboard(quote: OracleQuote): Promise<{ agrees: boolean; switchboardRate?: number }> {
  // Phase 1: stub returns "agreed" with the same rate
  logger.info({ pair: quote.pair }, '[STUB] Switchboard cross-check');
  return { agrees: true, switchboardRate: quote.rate };
}
