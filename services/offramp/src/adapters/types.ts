/**
 * Common interface every off-ramp adapter must implement.
 *
 * Per ADR 0005 (TransFi primary) + ADR 0006 (Sovereign-orchestrated partners):
 *   We never custody fiat. The adapter is a thin HTTP client over a licensed
 *   partner's API. Each call returns a `PayoutResult` whose status mirrors
 *   the provider's webhook lifecycle.
 *
 * Per PRINCIPLES § 11 (validate at boundaries): adapters validate input,
 * surface partner errors verbatim, never silently swallow failures.
 */

export type CashOutMethod =
  | 'gcash'
  | 'maya'
  | 'bdo-bank'
  | 'bpi-bank'
  | 'unionbank'
  | 'metrobank'
  | 'cebuana-cash-pickup'
  | 'upi'
  | 'neft-bank'
  | 'paytm'
  | 'phonepe'
  | 'gpay-india'
  | 'jazzcash'
  | 'easypaisa'
  | 'hbl-bank'
  | 'mcb-bank'
  | 'ubl-bank'
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'bd-bank'
  | 'm-pesa'
  | 'airtel-money'
  | 'kcb-bank'
  | 'equity-bank'
  | 'turkish-bank'
  | 'sepa'
  | 'sepa-instant'
  | 'uk-faster-payments'
  | 'us-ach'
  | 'us-wire'
  | 'bank-transfer';

export type ProviderName =
  | 'transfi'
  | 'wise'
  | 'flutterwave'
  | 'yellow-card'
  | 'thunes'
  | 'cebuana';

export type PayoutStatus =
  | 'pending' // submitted to provider, awaiting confirmation
  | 'processing' // provider acknowledged, in-flight
  | 'completed' // recipient received funds
  | 'failed' // permanent failure
  | 'cancelled'; // explicitly cancelled

export interface PayoutRequest {
  reference: string; // PING-XXXXXXXX, our internal reference
  method: CashOutMethod;
  amount: {
    usdcAmount: string; // amount in USDC we'll send to the provider
    localAmount: string; // amount the recipient receives in local currency
    localCurrency: string;
  };
  recipient: {
    phone?: string;
    name?: string;
    accountNumber?: string; // e.g., GCash number, IBAN, IFSC+account, etc.
    accountName?: string;
    bankCode?: string;
    extra?: Record<string, string>;
  };
}

export interface PayoutResult {
  reference: string;
  providerName: ProviderName;
  providerReference: string; // provider's tx ID
  status: PayoutStatus;
  estimatedCompletionSeconds?: number;
  metadata?: Record<string, unknown>;
}

export interface ProviderAdapter {
  name: ProviderName;
  /** Which methods this provider supports for this corridor */
  supports(method: CashOutMethod, country: string): boolean;
  /** Send the actual payout request */
  payout(request: PayoutRequest): Promise<PayoutResult>;
  /** Verify a webhook signature from this provider */
  verifyWebhook(payload: string, signature: string): boolean;
  /** Parse a webhook event into our internal PayoutStatus */
  parseWebhook(payload: string): {
    reference: string;
    status: PayoutStatus;
    metadata?: Record<string, unknown>;
  };
}
