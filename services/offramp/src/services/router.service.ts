/**
 * Provider routing + failover logic.
 *
 * Per ADR 0005 (TransFi primary + Wise/Flutterwave/etc. failover):
 *   1. Pick the best provider for (method, country)
 *   2. Attempt the payout
 *   3. On failure: failover to backup provider
 *   4. On all-fail: surface AllProvidersFailed error
 */
import { transfiAdapter } from '../adapters/transfi.adapter';
import type {
  ProviderAdapter,
  CashOutMethod,
  PayoutRequest,
  PayoutResult,
  ProviderName,
} from '../adapters/types';
import { wiseAdapter } from '../adapters/wise.adapter';
import { OfframpErrors } from '../utils/errors';
import { logger } from '../utils/logger';

const ALL_ADAPTERS: ProviderAdapter[] = [transfiAdapter, wiseAdapter];

/** Per-corridor routing preferences */
const ROUTING_PREFERENCE: Record<string, ProviderName[]> = {
  PH: ['transfi'],
  IN: ['transfi'],
  PK: ['transfi'],
  BD: ['transfi'],
  KE: ['transfi'],
  EU: ['wise'],
  UK: ['wise'],
  US: ['wise'],
};

function inferCountry(phone?: string): string {
  if (!phone) return 'UNKNOWN';
  if (phone.startsWith('+63')) return 'PH';
  if (phone.startsWith('+91')) return 'IN';
  if (phone.startsWith('+92')) return 'PK';
  if (phone.startsWith('+880')) return 'BD';
  if (phone.startsWith('+254')) return 'KE';
  if (phone.startsWith('+44')) return 'UK';
  if (phone.startsWith('+1')) return 'US';
  if (phone.startsWith('+3') || phone.startsWith('+4')) return 'EU';
  return 'UNKNOWN';
}

/**
 * Pick the ordered list of adapters that support the method+country.
 */
export function selectAdapters(method: CashOutMethod, country: string): ProviderAdapter[] {
  const preferenceOrder = ROUTING_PREFERENCE[country] ?? ['transfi', 'wise'];
  const result: ProviderAdapter[] = [];
  for (const name of preferenceOrder) {
    const adapter = ALL_ADAPTERS.find((a) => a.name === name && a.supports(method, country));
    if (adapter) result.push(adapter);
  }
  // Fallback: any adapter that supports the method
  for (const adapter of ALL_ADAPTERS) {
    if (adapter.supports(method, country) && !result.includes(adapter)) {
      result.push(adapter);
    }
  }
  return result;
}

/**
 * Execute the payout with provider failover.
 */
export async function executePayout(request: PayoutRequest): Promise<PayoutResult> {
  const country = inferCountry(request.recipient.phone);
  const adapters = selectAdapters(request.method, country);

  if (adapters.length === 0) {
    logger.error({ method: request.method, country }, 'No adapter supports this method+country');
    throw OfframpErrors.InvalidMethod();
  }

  const errors: Array<{ provider: ProviderName; error: unknown }> = [];

  for (const adapter of adapters) {
    try {
      logger.info(
        { provider: adapter.name, method: request.method, reference: request.reference },
        'Attempting payout',
      );
      const result = await adapter.payout(request);
      logger.info(
        {
          provider: adapter.name,
          reference: result.reference,
          providerReference: result.providerReference,
          status: result.status,
        },
        'Payout succeeded',
      );
      return result;
    } catch (err) {
      logger.warn(
        { provider: adapter.name, err: (err as Error).message },
        'Provider failed — trying next',
      );
      errors.push({ provider: adapter.name, error: err });
    }
  }

  logger.error({ errors }, 'All providers failed');
  throw OfframpErrors.AllProvidersFailed();
}

/**
 * Look up an adapter by name (for webhook handling).
 */
export function getAdapter(name: ProviderName): ProviderAdapter | null {
  return ALL_ADAPTERS.find((a) => a.name === name) ?? null;
}
