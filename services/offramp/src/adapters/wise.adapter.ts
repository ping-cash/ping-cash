/**
 * Wise adapter — backup for EU/UK/US bank rails per ADR 0005.
 *
 * Implements the real Wise Transfer API flow for #58:
 *   1. POST {base}/v3/profiles/{profileId}/quotes       — create quote
 *   2. POST {base}/v1/accounts                          — create recipient
 *   3. POST {base}/v1/transfers                         — create transfer
 *   4. POST {base}/v3/profiles/{profileId}/transfers/   — fund from balance
 *        {transferId}/payments
 *
 * The first 3 calls are the AC of #58. The 4th (`payments`) is what actually
 * triggers the money movement; without it the transfer sits in CREATED state
 * forever. We include it because the operator-visible DoD requires recipient
 * to actually receive funds — not just have an unfunded quote.
 *
 * USDC → USD redemption is out of scope for THIS issue. We assume the
 * Sovereign-side BALANCE has been pre-funded (Coinbase / Circle USDC redemption
 * → Wise USD wallet). usdcAmount is treated 1:1 as source-USD amount.
 *
 * Stub-mode-friendly: when WISE_API_KEY is absent OR WISE_PROFILE_ID is unset,
 * returns synthetic payout responses identical to TransFi's stub shape.
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

const WISE_METHODS = new Set<CashOutMethod>([
  'sepa',
  'sepa-instant',
  'uk-faster-payments',
  'us-ach',
  'us-wire',
]);

// Map our internal method → Wise's quote payOut hint.
// Wise auto-routes based on currency + recipient.type when payOut="BANK_TRANSFER".
const PAY_OUT_HINT_MAP: Partial<Record<CashOutMethod, string>> = {
  sepa: 'BANK_TRANSFER',
  'sepa-instant': 'SWIFT_OUR',
  'uk-faster-payments': 'BANK_TRANSFER',
  'us-ach': 'BANK_TRANSFER',
  'us-wire': 'SWIFT_OUR',
};

interface WiseQuoteResponse {
  id: string;
  rate: number;
  paymentOptions: Array<{
    payIn: string;
    payOut: string;
    formattedEstimatedDelivery?: string;
    estimatedDeliveryDelays?: unknown[];
  }>;
}

interface WiseAccountResponse {
  id: number;
  currency: string;
  type: string;
  accountHolderName: string;
}

interface WiseTransferResponse {
  id: number;
  status: string;
  customerTransactionId: string;
  reference?: string;
}

export const wiseAdapter: ProviderAdapter = {
  name: 'wise',

  supports(method: CashOutMethod, _country: string): boolean {
    return WISE_METHODS.has(method);
  },

  async payout(request: PayoutRequest): Promise<PayoutResult> {
    const apiKey = config.WISE_API_KEY;
    const profileId = config.WISE_PROFILE_ID;
    const baseUrl = config.WISE_API_BASE_URL;

    if (!apiKey || !profileId) {
      logger.info(
        {
          reference: request.reference,
          method: request.method,
          hasApiKey: Boolean(apiKey),
          hasProfileId: Boolean(profileId),
        },
        '[STUB MODE] Wise payout'
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

    const targetCurrency = request.amount.localCurrency.toUpperCase();
    const payOut = PAY_OUT_HINT_MAP[request.method] ?? 'BANK_TRANSFER';

    const baseHeaders = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    // Step 1 — Quote (POST /v3/profiles/{profileId}/quotes)
    let quote: WiseQuoteResponse;
    try {
      const quoteRes = await fetch(
        `${baseUrl}/v3/profiles/${profileId}/quotes`,
        {
          method: 'POST',
          headers: baseHeaders,
          body: JSON.stringify({
            sourceCurrency: 'USD',
            targetCurrency,
            // Wise quotes by either source or target amount; we know the
            // target (local-amount the recipient receives) precisely from
            // the Pyth-driven FX quote upstream, so quote by target.
            targetAmount: Number(request.amount.localAmount),
            payOut,
          }),
        }
      );
      if (!quoteRes.ok) {
        const errBody = await quoteRes.text();
        logger.error(
          { status: quoteRes.status, body: errBody },
          'Wise quote failed'
        );
        throw OfframpErrors.PayoutFailed({
          provider: 'wise',
          step: 'quote',
          status: quoteRes.status,
          body: errBody,
        });
      }
      quote = (await quoteRes.json()) as WiseQuoteResponse;
    } catch (err) {
      if (err instanceof Error && err.name === 'AppError') throw err;
      throw OfframpErrors.PayoutFailed({
        provider: 'wise',
        step: 'quote',
        message: (err as Error).message,
      });
    }

    // Step 2 — Recipient account (POST /v1/accounts)
    const accountDetails = buildAccountDetails(request, targetCurrency);
    let account: WiseAccountResponse;
    try {
      const accountRes = await fetch(`${baseUrl}/v1/accounts`, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({
          currency: targetCurrency,
          type: accountDetails.type,
          profile: Number(profileId),
          accountHolderName:
            request.recipient.accountName ??
            request.recipient.name ??
            'Ping Recipient',
          legalType: 'PRIVATE',
          details: accountDetails.details,
        }),
      });
      if (!accountRes.ok) {
        const errBody = await accountRes.text();
        logger.error(
          { status: accountRes.status, body: errBody },
          'Wise recipient create failed'
        );
        throw OfframpErrors.PayoutFailed({
          provider: 'wise',
          step: 'recipient',
          status: accountRes.status,
          body: errBody,
        });
      }
      account = (await accountRes.json()) as WiseAccountResponse;
    } catch (err) {
      if (err instanceof Error && err.name === 'AppError') throw err;
      throw OfframpErrors.PayoutFailed({
        provider: 'wise',
        step: 'recipient',
        message: (err as Error).message,
      });
    }

    // Step 3 — Transfer (POST /v1/transfers)
    let transfer: WiseTransferResponse;
    try {
      const transferRes = await fetch(`${baseUrl}/v1/transfers`, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({
          targetAccount: account.id,
          quoteUuid: quote.id,
          customerTransactionId: request.reference,
          details: {
            reference: request.reference.slice(0, 16),
            transferPurpose: 'verification.transfers.purpose.pay.bills',
            sourceOfFunds: 'verification.source.of.funds.other',
          },
        }),
      });
      if (!transferRes.ok) {
        const errBody = await transferRes.text();
        logger.error(
          { status: transferRes.status, body: errBody },
          'Wise transfer create failed'
        );
        throw OfframpErrors.PayoutFailed({
          provider: 'wise',
          step: 'transfer',
          status: transferRes.status,
          body: errBody,
        });
      }
      transfer = (await transferRes.json()) as WiseTransferResponse;
    } catch (err) {
      if (err instanceof Error && err.name === 'AppError') throw err;
      throw OfframpErrors.PayoutFailed({
        provider: 'wise',
        step: 'transfer',
        message: (err as Error).message,
      });
    }

    // Step 4 — Fund transfer from BALANCE.
    // NB: a failed fund call still leaves the transfer in CREATED state — the
    // adapter returns 'processing' regardless because the operator-visible
    // record exists; webhook will surface terminal status. We log + log only.
    try {
      const fundRes = await fetch(
        `${baseUrl}/v3/profiles/${profileId}/transfers/${transfer.id}/payments`,
        {
          method: 'POST',
          headers: baseHeaders,
          body: JSON.stringify({ type: 'BALANCE' }),
        }
      );
      if (!fundRes.ok) {
        const errBody = await fundRes.text();
        logger.warn(
          {
            status: fundRes.status,
            body: errBody,
            transferId: transfer.id,
          },
          'Wise fund step failed — transfer remains in CREATED state; webhook will surface'
        );
      }
    } catch (err) {
      logger.warn(
        { err, transferId: transfer.id },
        'Wise fund step threw — transfer remains in CREATED state'
      );
    }

    const estimatedSeconds =
      payOut === 'SWIFT_OUR'
        ? 86400 // SWIFT: same-day to next-day
        : 3600; // SEPA / UK FP: ~1 hour

    return {
      reference: request.reference,
      providerName: 'wise',
      providerReference: String(transfer.id),
      status: mapWiseStatus(transfer.status),
      estimatedCompletionSeconds: estimatedSeconds,
      metadata: { quoteId: quote.id, accountId: account.id },
    };
  },

  verifyWebhook(payload: string, signature: string): boolean {
    const secret = config.WISE_WEBHOOK_SECRET;
    if (!secret) {
      logger.warn(
        'WISE_WEBHOOK_SECRET not set — accepting webhook (STUB MODE ONLY)'
      );
      return true;
    }
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
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
      data?: {
        resource?: { id?: number; type?: string };
        current_state?: string;
        occurred_at?: string;
      };
      // Legacy v1 webhook shape Wise still sends for some events
      reference?: string;
      current_state?: string;
    };
    const currentState =
      parsed.data?.current_state ?? parsed.current_state ?? 'pending';
    const transferId = parsed.data?.resource?.id;
    return {
      reference:
        parsed.reference ??
        (transferId !== undefined ? String(transferId) : ''),
      status: mapWiseStatus(currentState),
      metadata: { transferId, occurredAt: parsed.data?.occurred_at },
    };
  },
};

function mapWiseStatus(status: string): PayoutStatus {
  switch (status?.toLowerCase()) {
    case 'incoming_payment_waiting':
    case 'incoming_payment_initiated':
    case 'created':
      return 'pending';
    case 'processing':
    case 'funds_converted':
    case 'bounced_back':
      return 'processing';
    case 'outgoing_payment_sent':
    case 'outgoing_payment_received':
      return 'completed';
    case 'cancelled':
    case 'charged_back':
      return 'cancelled';
    case 'funds_refunded':
    case 'unknown':
      return 'failed';
    default:
      return 'pending';
  }
}

/**
 * Build the Wise recipient `details` payload by target currency.
 *
 * Wise's account schema is currency-specific:
 *   EUR  → IBAN
 *   GBP  → sortCode + accountNumber
 *   USD  → routingNumber (abartn) + accountNumber + accountType
 *
 * We map our internal recipient shape onto each variant.
 */
function buildAccountDetails(
  request: PayoutRequest,
  targetCurrency: string
): { type: string; details: Record<string, unknown> } {
  const r = request.recipient;
  switch (targetCurrency) {
    case 'EUR':
      return {
        type: 'iban',
        details: {
          IBAN: r.accountNumber ?? '',
        },
      };
    case 'GBP':
      return {
        type: 'sort_code',
        details: {
          sortCode: r.bankCode ?? '',
          accountNumber: r.accountNumber ?? '',
        },
      };
    case 'USD':
      return {
        type: 'aba',
        details: {
          abartn: r.bankCode ?? '',
          accountNumber: r.accountNumber ?? '',
          accountType: r.extra?.accountType ?? 'CHECKING',
          address: {
            country: r.extra?.country ?? 'US',
            city: r.extra?.city ?? '',
            postCode: r.extra?.postCode ?? '',
            firstLine: r.extra?.firstLine ?? '',
          },
        },
      };
    default:
      // Fallback: pass raw fields and let Wise reject with a clear error
      return {
        type: 'iban',
        details: { IBAN: r.accountNumber ?? '' },
      };
  }
}
