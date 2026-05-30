/**
 * Onramper aggregator adapter (cash-in) — per ADR 0026.
 *
 * Onramper is Ping's SOLE on-ramp aggregator. USD card → USDC on Base
 * via Topper → CCTP-free treasury rebalance to Solana.
 *
 * Two responsibilities:
 *   1. Quote fetch:  GET /quotes/{fiat}/{crypto}?amount=X&country=Y
 *      → returns each underlying ramp's payout estimate + per-method
 *        availability. We pick `recommendations: ["BestPrice"]` or the
 *        highest `payout`.
 *   2. Signed widget URL: builds buy.onramper.com URL with
 *      partner-locked params + HMAC-SHA256 signature so users can't
 *      tamper amount/crypto/wallet via dev-tools.
 *
 * Stub-mode-friendly: when ONRAMPER_API_KEY is absent, returns synthetic
 * quote responses so the mobile UI walk doesn't crash. Stub mode is
 * detected and surfaced via `isLive: false`.
 *
 * Auth:
 *   - Quote: header `Authorization: <api-key>`
 *   - Widget URL: HMAC-SHA256(signing_secret, urlPath + queryString) as hex
 */
import { createHmac } from 'node:crypto';

import { loadConfig } from '@ping/config';

import { logger } from '../utils/logger';

const config = loadConfig();

export interface OnramperQuote {
  /** Underlying provider that returned the best payout (e.g., "topper") */
  ramp: string;
  /** USDC (or USDT) amount the user will receive */
  payout: number;
  /** Output crypto code (e.g., "usdc_base") */
  crypto: string;
  /** Fiat code (e.g., "USD") */
  fiat: string;
  /** Fiat amount the user pays */
  fiatAmount: number;
  /** Effective rate fiat-per-1-crypto */
  rate: number;
  /** Payment methods returned for this ramp (creditcard, debitcard, applepay, googlepay) */
  paymentMethods: string[];
  /** Onramper quote ID — pass-through to /transaction for tracking */
  quoteId?: string;
  /** True if this came from the real Onramper API; false in stub mode */
  isLive: boolean;
}

export interface OnramperCheckoutRequest {
  fiatCurrency: string; // "USD"
  fiatAmount: number; // 100
  crypto: string; // "usdc_base"
  walletAddress: string; // Solana wallet address (Privy MPC)
  userId: string; // for partnerData tagging
  email?: string;
  country?: string;
}

export interface OnramperCheckoutResponse {
  /** Signed buy.onramper.com URL — mobile launches this in WebView */
  checkoutUrl: string;
  /** Best-rate quote attached at session creation time for UI display */
  quote: OnramperQuote;
  /** True if checkoutUrl points at the real Onramper sandbox; false in stub mode */
  isLive: boolean;
}

const ONRAMPER_WIDGET_BASE = 'https://buy.onramper.com';

/**
 * Fetch best Onramper quote for the given fiat+crypto+amount.
 * Returns the first ramp tagged "BestPrice" / "Recommended", or the
 * highest `payout` if no recommendation flag is set.
 */
export async function fetchOnramperQuote(args: {
  fiatCurrency: string;
  fiatAmount: number;
  crypto: string;
  country?: string;
  paymentMethod?: string;
}): Promise<OnramperQuote> {
  const apiKey = config.ONRAMPER_API_KEY;
  const apiBase = config.ONRAMPER_API_BASE_URL;
  const fiat = args.fiatCurrency.toUpperCase();
  const crypto = args.crypto.toLowerCase();
  const amount = args.fiatAmount;

  if (!apiKey) {
    logger.warn(
      { fiat, crypto, amount },
      '[STUB MODE] ONRAMPER_API_KEY unset — returning synthetic quote'
    );
    return {
      ramp: 'topper',
      payout: amount * 0.9838, // synthetic ~1.62% fee per ADR 0026
      crypto,
      fiat,
      fiatAmount: amount,
      rate: 1.0165,
      paymentMethods: ['creditcard', 'debitcard', 'applepay', 'googlepay'],
      isLive: false,
    };
  }

  const params = new URLSearchParams({
    amount: String(amount),
  });
  if (args.country) params.set('country', args.country);
  if (args.paymentMethod) params.set('paymentMethod', args.paymentMethod);

  const url = `${apiBase}/quotes/${fiat}/${crypto}?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: apiKey },
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error(
      { status: response.status, body: text, url },
      'Onramper quote fetch failed'
    );
    throw new Error(`Onramper quote ${response.status}: ${text}`);
  }

  const quotes = (await response.json()) as Array<{
    ramp: string;
    payout?: number;
    rate?: number;
    quoteId?: string;
    paymentMethod?: string;
    availablePaymentMethods?: Array<{ paymentTypeId: string }>;
    recommendations?: string[];
    errors?: Array<{ message: string }>;
  }>;

  // Filter to ramps that returned a payout (i.e., didn't error)
  const valid = quotes.filter(q => typeof q.payout === 'number' && !q.errors);
  if (valid.length === 0) {
    throw new Error('Onramper: no ramp returned a usable quote');
  }

  // Prefer BestPrice tag; fall back to highest payout
  const best =
    valid.find(q => q.recommendations?.includes('BestPrice')) ??
    valid.sort((a, b) => (b.payout ?? 0) - (a.payout ?? 0))[0];

  const paymentMethods =
    best.availablePaymentMethods?.map(m => m.paymentTypeId) ?? [];

  return {
    ramp: best.ramp,
    payout: best.payout ?? 0,
    crypto,
    fiat,
    fiatAmount: amount,
    rate: best.rate ?? amount / (best.payout ?? amount),
    paymentMethods,
    quoteId: best.quoteId,
    isLive: true,
  };
}

/**
 * Build a signed checkout URL for buy.onramper.com.
 *
 * Onramper's documented signing pattern: HMAC-SHA256 over the query
 * string (alphabetically ordered) with the partner signing secret;
 * the resulting hex digest is appended as `&signature=<hex>`.
 *
 * This locks down `defaultAmount`, `defaultFiat`, `defaultCrypto`,
 * and `wallets` so the user can't tamper with them in dev-tools.
 */
export function buildOnramperCheckoutUrl(
  req: OnramperCheckoutRequest,
  quote: OnramperQuote
): OnramperCheckoutResponse {
  const apiKey = config.ONRAMPER_API_KEY;
  const signingSecret = config.ONRAMPER_SIGNING_SECRET;

  if (!apiKey || !signingSecret) {
    logger.warn(
      { fiatAmount: req.fiatAmount, crypto: req.crypto },
      '[STUB MODE] Onramper checkout URL — credentials missing, using unsigned URL'
    );
    const stubParams = new URLSearchParams({
      defaultAmount: String(req.fiatAmount),
      defaultFiat: req.fiatCurrency,
      defaultCrypto: req.crypto,
      isAmountEditable: 'false',
    });
    return {
      checkoutUrl: `${ONRAMPER_WIDGET_BASE}/?${stubParams.toString()}`,
      quote,
      isLive: false,
    };
  }

  // Locked params — these are signed so the user cannot tamper.
  const lockedParams: Record<string, string> = {
    apiKey,
    defaultAmount: String(req.fiatAmount),
    defaultFiat: req.fiatCurrency,
    defaultCrypto: req.crypto,
    wallets: `${req.crypto}:${req.walletAddress}`,
    partnerData: `userId=${req.userId}`,
  };
  if (req.email) lockedParams.email = req.email;
  if (req.country) lockedParams.country = req.country;

  // Stable canonical query string (alphabetically ordered, URL-encoded)
  const ordered = Object.keys(lockedParams).sort();
  const canonicalQuery = ordered
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(lockedParams[k])}`)
    .join('&');

  const signature = createHmac('sha256', signingSecret)
    .update(canonicalQuery)
    .digest('hex');

  const checkoutUrl = `${ONRAMPER_WIDGET_BASE}/?${canonicalQuery}&signature=${signature}`;

  logger.info(
    {
      fiatAmount: req.fiatAmount,
      fiat: req.fiatCurrency,
      crypto: req.crypto,
      ramp: quote.ramp,
      payout: quote.payout,
    },
    'Built Onramper signed checkout URL'
  );

  return {
    checkoutUrl,
    quote,
    isLive: true,
  };
}

/**
 * Verify an inbound webhook signature from Onramper.
 *
 * Onramper webhook header pattern (per docs.onramper.com/docs/webhooks):
 *   X-Onramper-Signature: <hex HMAC-SHA256 over raw body>
 */
export function verifyOnramperWebhook(
  rawBody: string,
  signature: string
): boolean {
  const secret = config.ONRAMPER_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn(
      'ONRAMPER_WEBHOOK_SECRET not set — accepting webhook (STUB MODE ONLY)'
    );
    return true;
  }
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  if (expected.length !== signature.length) return false;
  // Timing-safe compare
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}
