/**
 * TransFi adapter — primary off-ramp per ADR 0005.
 *
 * Stub-mode-friendly: when TRANSFI_API_KEY is absent, returns
 * synthetic payout responses. In production, hits TransFi's REST API.
 */
import { createHmac } from 'node:crypto';

import { loadConfig } from '@ping/config';

import { OfframpErrors } from '../utils/errors';
import { logger } from '../utils/logger';

import type {
  ProviderAdapter,
  CashOutMethod,
  PayoutRequest,
  PayoutResult,
  PayoutStatus,
} from './types';

const config = loadConfig();

// Mapping our internal method → TransFi's method codes
const TRANSFI_METHOD_MAP: Partial<
  Record<CashOutMethod, { service: string; subservice: string }>
> = {
  gcash: { service: 'mobile-wallet', subservice: 'GCASH_PH' },
  maya: { service: 'mobile-wallet', subservice: 'MAYA_PH' },
  'bdo-bank': { service: 'bank-transfer', subservice: 'PH_BDO' },
  'bpi-bank': { service: 'bank-transfer', subservice: 'PH_BPI' },
  'cebuana-cash-pickup': { service: 'cash-pickup', subservice: 'CEBUANA_PH' },
  upi: { service: 'mobile-wallet', subservice: 'UPI_IN' },
  'neft-bank': { service: 'bank-transfer', subservice: 'NEFT_IN' },
  paytm: { service: 'mobile-wallet', subservice: 'PAYTM_IN' },
  jazzcash: { service: 'mobile-wallet', subservice: 'JAZZCASH_PK' },
  easypaisa: { service: 'mobile-wallet', subservice: 'EASYPAISA_PK' },
  'bank-transfer': { service: 'bank-transfer', subservice: 'IBFT_PK' },
  'turkish-bank': { service: 'bank-transfer', subservice: 'IBAN_TR' },
  bkash: { service: 'mobile-wallet', subservice: 'BKASH_BD' },
  nagad: { service: 'mobile-wallet', subservice: 'NAGAD_BD' },
  'm-pesa': { service: 'mobile-wallet', subservice: 'MPESA_KE' },
  'airtel-money': { service: 'mobile-wallet', subservice: 'AIRTEL_KE' },
};

export const transfiAdapter: ProviderAdapter = {
  name: 'transfi',

  supports(method: CashOutMethod, _country: string): boolean {
    return TRANSFI_METHOD_MAP[method] !== undefined;
  },

  async payout(request: PayoutRequest): Promise<PayoutResult> {
    const apiKey = config.TRANSFI_API_KEY;
    const apiSecret = config.TRANSFI_API_SECRET;

    if (!apiKey || !apiSecret) {
      logger.info(
        { reference: request.reference, method: request.method },
        '[STUB MODE] TransFi payout'
      );
      return {
        reference: request.reference,
        providerName: 'transfi',
        providerReference: `TF_STUB_${Date.now()}`,
        status: 'processing',
        estimatedCompletionSeconds: 30,
        metadata: { stub: true },
      };
    }

    const mapped = TRANSFI_METHOD_MAP[request.method];
    if (!mapped) {
      throw OfframpErrors.InvalidMethod();
    }

    try {
      const response = await fetch('https://api.transfi.com/v1/payouts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: request.reference,
          payoutMethod: mapped.service,
          subservice: mapped.subservice,
          sourceCurrency: 'USDC',
          sourceAmount: request.amount.usdcAmount,
          destinationCurrency: request.amount.localCurrency,
          destinationAmount: request.amount.localAmount,
          recipient: {
            phone: request.recipient.phone,
            name: request.recipient.name,
            accountNumber: request.recipient.accountNumber,
            accountName: request.recipient.accountName,
            bankCode: request.recipient.bankCode,
            ...request.recipient.extra,
          },
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        logger.error(
          { status: response.status, body: errBody },
          'TransFi payout failed'
        );
        throw OfframpErrors.PayoutFailed({
          provider: 'transfi',
          status: response.status,
          body: errBody,
        });
      }

      const body = (await response.json()) as {
        transactionId: string;
        status: string;
        estimatedCompletionMinutes?: number;
      };

      return {
        reference: request.reference,
        providerName: 'transfi',
        providerReference: body.transactionId,
        status: mapTransfiStatus(body.status),
        estimatedCompletionSeconds: (body.estimatedCompletionMinutes ?? 0) * 60,
      };
    } catch (err) {
      logger.error(
        { err, reference: request.reference },
        'TransFi payout error'
      );
      if (err instanceof Error && err.name === 'AppError') throw err;
      throw OfframpErrors.PayoutFailed({ message: (err as Error).message });
    }
  },

  verifyWebhook(payload: string, signature: string): boolean {
    const secret = config.TRANSFI_WEBHOOK_SECRET;
    if (!secret) {
      logger.warn(
        'TRANSFI_WEBHOOK_SECRET not set — accepting webhook (STUB MODE ONLY)'
      );
      return true;
    }
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    // Timing-safe comparison
    if (expected.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
  },

  parseWebhook(payload: string): {
    reference: string;
    status: PayoutStatus;
    metadata?: Record<string, unknown>;
  } {
    const parsed = JSON.parse(payload) as {
      orderId: string;
      status: string;
      transactionId?: string;
      completedAt?: string;
      failedReason?: string;
    };
    return {
      reference: parsed.orderId,
      status: mapTransfiStatus(parsed.status),
      metadata: {
        transactionId: parsed.transactionId,
        completedAt: parsed.completedAt,
        failedReason: parsed.failedReason,
      },
    };
  },
};

function mapTransfiStatus(status: string): PayoutStatus {
  switch (status?.toLowerCase()) {
    case 'pending':
    case 'queued':
      return 'pending';
    case 'processing':
    case 'in_progress':
      return 'processing';
    case 'completed':
    case 'success':
    case 'paid':
      return 'completed';
    case 'failed':
    case 'rejected':
      return 'failed';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    default:
      return 'pending';
  }
}
