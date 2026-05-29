/**
 * Cash-in payment intent builder — Stripe PaymentSheet integration.
 *
 * Mobile /cashin screen taps "Apple Pay" / "Debit/credit card" → calls
 * POST /wallet/cashin/intent with { amountUsd, method } → receives a
 * Stripe PaymentIntent clientSecret which the @stripe/stripe-react-native
 * PaymentSheet consumes. On confirm the funds settle into our Stripe
 * connected account; a separate ACH leg (out of scope here) sweeps them
 * onto the user's Solana wallet as USDC.
 *
 * Until founder completes Stripe sign-up + the STRIPE_SECRET_KEY config
 * lands on openova-private, this service runs in stub mode and returns
 * a synthetic clientSecret so the mobile UI can still walk the sheet
 * during dev. The PaymentSheet will fail at confirm in stub mode —
 * that's the correct preview state.
 */
import { loadConfig } from '@ping/config';
import Stripe from 'stripe';
import type { Stripe as StripeNS } from 'stripe';

import { logger } from '../utils/logger';

export type CashinMethod = 'apple_pay' | 'card' | 'ach';

export interface CashinIntent {
  clientSecret: string;
  amount: number;
  currency: string;
  publishableKey: string;
  ephemeralKey?: string;
  customerId?: string;
  /** True when the intent came from real Stripe; false in stub mode. */
  isLive: boolean;
}

let _stripe: StripeNS | null = null;

function getClient(): StripeNS | null {
  if (_stripe) return _stripe;
  const config = loadConfig();
  const secret = config.STRIPE_SECRET_KEY;
  if (!secret) return null;
  _stripe = new Stripe(secret, {
    apiVersion: '2026-05-27.dahlia',
    typescript: true,
  });
  return _stripe;
}

/**
 * Build a PaymentIntent for the given USD amount + cash-in method.
 * Returns clientSecret the mobile PaymentSheet consumes.
 *
 * In stub mode (STRIPE_SECRET_KEY unset) returns a synthetic clientSecret
 * so the mobile UI walk doesn't crash. PaymentSheet will fail at confirm
 * which is the right preview signal.
 */
export async function buildCashinIntent(args: {
  amountUsd: string;
  method: CashinMethod;
  userId: string;
  recipientWallet: string;
}): Promise<CashinIntent> {
  const config = loadConfig();
  const amountCents = Math.round(parseFloat(args.amountUsd) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error('Invalid amount');
  }

  const publishableKey =
    config.STRIPE_PUBLISHABLE_KEY ||
    // Stripe's documented sample test publishable key — safe to ship in
    // stub mode; it accepts no card details.
    'pk_test_TYooMQauvdEDq54NiTphI7jx';

  const client = getClient();
  if (!client) {
    logger.warn(
      { method: args.method, amountUsd: args.amountUsd },
      '[STUB MODE] Stripe key unset — returning synthetic clientSecret'
    );
    return {
      clientSecret: `pi_stub_${Date.now()}_secret_stub`,
      amount: amountCents,
      currency: 'usd',
      publishableKey,
      isLive: false,
    };
  }

  // Map our method to Stripe payment_method_types.
  const paymentMethodTypes: string[] =
    args.method === 'apple_pay'
      ? ['card'] // Apple Pay is a wallet wrapper around card.
      : args.method === 'ach'
        ? ['us_bank_account']
        : ['card'];

  // Customer ephemeral key so the PaymentSheet can show saved methods.
  const customer = await client.customers.create({
    metadata: {
      pingUserId: args.userId,
      pingWallet: args.recipientWallet,
    },
  });
  const ephemeral = await client.ephemeralKeys.create(
    { customer: customer.id },
    { apiVersion: '2026-05-27.dahlia' }
  );

  const intent = await client.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: customer.id,
    payment_method_types: paymentMethodTypes,
    metadata: {
      pingUserId: args.userId,
      pingWallet: args.recipientWallet,
      pingMethod: args.method,
    },
    description: `Ping cash-in via ${args.method}`,
  });

  if (!intent.client_secret) {
    throw new Error('Stripe returned a PaymentIntent without client_secret');
  }

  logger.info(
    {
      intentId: intent.id,
      amountCents,
      method: args.method,
      customerId: customer.id,
    },
    'Built Stripe PaymentIntent for cash-in'
  );

  return {
    clientSecret: intent.client_secret,
    amount: amountCents,
    currency: 'usd',
    publishableKey,
    ephemeralKey: ephemeral.secret,
    customerId: customer.id,
    isLive: true,
  };
}
