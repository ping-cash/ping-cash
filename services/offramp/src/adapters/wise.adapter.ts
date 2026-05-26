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
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

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
            // payIn=BALANCE matches Step 4's fund-from-balance — keeping these
            // aligned ensures the quoted fee matches what actually gets charged
            // (Wise applies different fee schedules per pay-in source).
            payIn: 'BALANCE',
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
          // legalType belongs INSIDE details per Wise OpenAPI v1 accounts
          // schema (top-level legalType is dropped silently by the API).
          details: { ...accountDetails.details, legalType: 'PRIVATE' },
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
          // Wise requires customerTransactionId to be a UUID. We can't reuse
          // request.reference (PING-XXXXXXXX) directly; derive a deterministic
          // UUIDv5-style value from it would be ideal but UUIDv4 is sufficient
          // for idempotency at the Wise side (we already de-dupe upstream by
          // request.reference in our own ledger).
          customerTransactionId: randomUUID(),
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
    // If the fund call fails the transfer sits in CREATED forever and the
    // recipient never sees money. We surface a 'failed' status to the
    // orchestrator so it can decide between (a) retry, (b) cancel + refund,
    // (c) fall back to TransFi (router.service). The transfer object exists
    // on Wise's side either way, so providerReference is still returned.
    let fundFailed = false;
    let fundFailureDetails: Record<string, unknown> | undefined;
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
        logger.error(
          {
            status: fundRes.status,
            body: errBody,
            transferId: transfer.id,
          },
          'Wise fund step failed — surfacing as failed for orchestrator fallback'
        );
        fundFailed = true;
        fundFailureDetails = { status: fundRes.status, body: errBody };
      }
    } catch (err) {
      logger.error(
        { err, transferId: transfer.id },
        'Wise fund step threw — surfacing as failed for orchestrator fallback'
      );
      fundFailed = true;
      fundFailureDetails = { message: (err as Error).message };
    }

    const estimatedSeconds =
      payOut === 'SWIFT_OUR'
        ? 86400 // SWIFT: same-day to next-day
        : 3600; // SEPA / UK FP: ~1 hour

    return {
      reference: request.reference,
      providerName: 'wise',
      providerReference: String(transfer.id),
      status: fundFailed ? 'failed' : mapWiseStatus(transfer.status),
      estimatedCompletionSeconds: estimatedSeconds,
      metadata: {
        quoteId: quote.id,
        accountId: account.id,
        ...(fundFailed ? { fundFailure: fundFailureDetails } : {}),
      },
    };
  },

  verifyWebhook(payload: string, signature: string): boolean {
    const secret = config.WISE_WEBHOOK_SECRET;
    if (!secret) {
      // Production-hard-fail: never accept unsigned webhooks outside dev.
      // Wise's real webhooks are signed; in dev we may want to skip while
      // the OpenBao secret is being provisioned, but in production this
      // is a critical defense.
      // NB: Wise's production webhooks are RSA-SHA256 against Wise's
      // published public key, not HMAC. AC of #58 calls for HMAC against
      // WISE_WEBHOOK_SECRET — keep that for now + file a follow-up TBD
      // to swap to the RSA-SHA256 verification path against Wise's JWK.
      if (config.NODE_ENV === 'production') {
        logger.error(
          'WISE_WEBHOOK_SECRET not set in production — rejecting webhook'
        );
        return false;
      }
      logger.warn(
        'WISE_WEBHOOK_SECRET not set — accepting webhook (DEV STUB MODE)'
      );
      return true;
    }
    const expected = createHmac('sha256', secret).update(payload).digest();
    const provided = Buffer.from(signature, 'hex');
    if (provided.length !== expected.length) return false;
    return timingSafeEqual(expected, provided);
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
