/**
 * Cash-in checkout builder — Onramper aggregator integration (ADR 0026).
 *
 * Mobile /cashin screen taps "Pay with card" → calls
 *   POST /wallet/cashin/intent with { amountUsd, walletAddress, userId, email? }
 * → backend fetches best Onramper quote (Topper-via-Onramper-Base in prod)
 * → backend builds a signed buy.onramper.com URL
 * → mobile launches the URL in a WebView
 *
 * After payment completes, Onramper posts to /notify/webhooks/onramper
 * which updates the ledger and pushes a notification to the user.
 *
 * Stub mode: when ONRAMPER_API_KEY is absent, returns a synthetic quote
 * + unsigned widget URL so the mobile UI walk doesn't crash. PaymentSheet
 * → equivalently this widget will not transact in stub mode.
 *
 * Per ADR 0026 §"What's IN scope": default destination = USDC on Base.
 * Per ADR 0026 §"Per-step ownership": Ping discloses Ping fee ~1.62%
 * to the user; bank FX is the user's bank's relationship.
 */
import { loadConfig } from '@ping/config';

import {
  fetchOnramperQuote,
  buildOnramperCheckoutUrl,
  type OnramperQuote,
} from '../adapters/onramper.adapter';

export type CashinMethod = 'apple_pay' | 'card' | 'ach' | 'google_pay';

export interface CashinIntent {
  /** Signed Onramper widget URL — mobile launches this in WebView */
  checkoutUrl: string;
  /** Fiat amount in minor units (e.g., cents for USD) for ledger display */
  amount: number;
  /** Fiat currency code (always 'USD' per ADR 0026 §"What's IN scope") */
  currency: string;
  /** Expected USDC delivered (best-quote payout at intent build time) */
  expectedUsdcAmount: number;
  /** Underlying ramp that gave the best quote (e.g., 'topper') */
  provider: string;
  /** Effective fee % shown to user — Ping's slice only, not bank FX */
  feePercent: number;
  /** True when intent is signed by real Onramper sandbox; false in stub */
  isLive: boolean;
}

export async function buildCashinIntent(args: {
  amountUsd: string;
  method: CashinMethod;
  userId: string;
  recipientWallet: string;
  email?: string;
  country?: string;
}): Promise<CashinIntent> {
  const config = loadConfig();
  const amountUsd = parseFloat(args.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new Error('Invalid amount');
  }

  const crypto = config.ONRAMPER_DEFAULT_CRYPTO; // default 'usdc_base' per ADR 0026
  const paymentMethodMap: Record<CashinMethod, string> = {
    apple_pay: 'applepay',
    google_pay: 'googlepay',
    card: 'creditcard',
    ach: 'banktransfer',
  };

  const quote: OnramperQuote = await fetchOnramperQuote({
    fiatCurrency: 'USD',
    fiatAmount: amountUsd,
    crypto,
    country: args.country,
    paymentMethod: paymentMethodMap[args.method],
  });

  const checkout = buildOnramperCheckoutUrl(
    {
      fiatCurrency: 'USD',
      fiatAmount: amountUsd,
      crypto,
      walletAddress: args.recipientWallet,
      userId: args.userId,
      email: args.email,
      country: args.country,
    },
    quote
  );

  const feePercent =
    quote.payout > 0 ? ((amountUsd - quote.payout) / amountUsd) * 100 : 1.62; // ADR 0026 nominal

  return {
    checkoutUrl: checkout.checkoutUrl,
    amount: Math.round(amountUsd * 100),
    currency: 'USD',
    expectedUsdcAmount: quote.payout,
    provider: quote.ramp,
    feePercent: Math.round(feePercent * 100) / 100,
    isLive: quote.isLive && checkout.isLive,
  };
}
