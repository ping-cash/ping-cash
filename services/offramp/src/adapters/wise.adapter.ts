/**
 * Wise adapter — backup for EU/UK/US bank rails.
 *
 * Per ADR 0005: Wise handles SEPA, UK Faster Payments, US ACH.
 *
 * Stub-mode-friendly.
 */
import { createHmac } from 'node:crypto';
import { loadConfig } from '@ping/config';
import { logger } from '../utils/logger';
import type {
  ProviderAdapter,
  CashOutMethod,
  PayoutRequest,
  PayoutResult,
  PayoutStatus,
} from './types';

const config = loadConfig();

const WISE_METHODS = new Set<CashOutMethod>([
  'sepa', 'sepa-instant', 'uk-faster-payments', 'us-ach', 'us-wire',
]);

export const wiseAdapter: ProviderAdapter = {
  name: 'wise',

  supports(method: CashOutMethod, _country: string): boolean {
    return WISE_METHODS.has(method);
  },

  async payout(request: PayoutRequest): Promise<PayoutResult> {
    const apiKey = config.WISE_API_KEY;

    if (!apiKey) {
      logger.info(
        { reference: request.reference, method: request.method },
        '[STUB MODE] Wise payout',
      );
      return {
        reference: request.reference,
        providerName: 'wise',
        providerReference: `WS_STUB_${Date.now()}`,
        status: 'processing',
        estimatedCompletionSeconds: 300,
        metadata: { stub: true },
      };
    }

    // Real Wise API integration is more complex (quote → recipient → transfer)
    // For Phase 1 we stub it cleanly; real integration in Phase 2 expansion.
    logger.info({ reference: request.reference }, '[PLACEHOLDER] Wise full integration');
    return {
      reference: request.reference,
      providerName: 'wise',
      providerReference: `WS_${Date.now()}`,
      status: 'processing',
      estimatedCompletionSeconds: 3600,
    };
  },

  verifyWebhook(payload: string, signature: string): boolean {
    const secret = config.WISE_WEBHOOK_SECRET;
    if (!secret) return true; // stub
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    if (expected.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
  },

  parseWebhook(payload: string): { reference: string; status: PayoutStatus } {
    const parsed = JSON.parse(payload) as { reference: string; current_state: string };
    const statusMap: Record<string, PayoutStatus> = {
      incoming_payment_waiting: 'pending',
      processing: 'processing',
      outgoing_payment_sent: 'completed',
      cancelled: 'cancelled',
      funds_refunded: 'failed',
    };
    return {
      reference: parsed.reference,
      status: statusMap[parsed.current_state] ?? 'pending',
    };
  },
};
