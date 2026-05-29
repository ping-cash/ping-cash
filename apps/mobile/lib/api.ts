import Constants from 'expo-constants';
import type { SendIntent } from '@ping/types';

/**
 * API Client for Ping Backend Services
 *
 * In development:
 * - If running on physical device via Expo Go, use your computer's IP
 * - If running on simulator/emulator, use localhost
 *
 * The API_URL can be configured via:
 * 1. Environment variable (production)
 * 2. Expo Constants extra field
 * 3. Default fallback for development
 */

// Determine the base URL based on environment
function getBaseUrl(): string {
  // Check for explicit configuration
  const configuredUrl = Constants.expoConfig?.extra?.apiUrl;
  if (configuredUrl) {
    return configuredUrl;
  }

  // Development defaults
  if (__DEV__) {
    // For Expo Go on physical device, you need your machine's IP
    // Update this to your development machine's IP when testing on device
    //
    // To find your IP:
    //   macOS: ipconfig getifaddr en0
    //   Linux: hostname -I | awk '{print $1}'
    //   Windows: ipconfig | findstr IPv4
    //
    // Example: return 'http://192.168.1.100:3001';

    // Default to localhost (works for simulator/emulator)
    return 'http://localhost:3001';
  }

  // Production URL
  return 'https://api.ping.cash';
}

class ApiClient {
  public baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = getBaseUrl();
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(
          error.message || `HTTP ${response.status}`,
          response.status,
          error.code
        );
      }

      // Handle empty responses
      const text = await response.text();
      return text ? JSON.parse(text) : ({} as T);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      // Network error or other issue
      throw new ApiError(
        'Network error. Please check your connection.',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  // ==========================================
  // Health & Status
  // ==========================================

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }

  // ==========================================
  // Authentication
  // ==========================================

  async initAuth(phone: string): Promise<{ sessionId: string }> {
    return this.request('/auth/init', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyOtp(
    sessionId: string,
    code: string
  ): Promise<{ token: string; user: User }> {
    return this.request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ sessionId, code }),
    });
  }

  async refreshToken(): Promise<{ token: string }> {
    return this.request('/auth/refresh', { method: 'POST' });
  }

  async logout(): Promise<void> {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // ==========================================
  // Wallet
  // ==========================================

  async getBalance(): Promise<BalanceSnapshot> {
    return this.request('/wallet/balance');
  }

  async getVaultPosition(): Promise<VaultPosition> {
    return this.request('/wallet/vault');
  }

  async getWalletAddress(): Promise<{ address: string; chain: string }> {
    return this.request('/wallet/address');
  }

  // Pillar 4 send-side: fetch unsigned USDC SPL Token transfer for client
  // Privy MPC signing. Returns the base64 serializedTransaction + ATA + atomic
  // amount metadata. Per ADR 0017 the backend NEVER signs.
  async buildSendIntent(
    recipientWallet: string,
    amountUsdc: string
  ): Promise<SendIntent> {
    return this.request('/wallet/send-intent', {
      method: 'POST',
      body: JSON.stringify({ recipientWallet, amountUsdc }),
    });
  }

  // Stripe cash-in (#88). Backend returns a PaymentIntent clientSecret
  // the @stripe/stripe-react-native PaymentSheet consumes. In stub mode
  // (STRIPE_SECRET_KEY unset on wallet-service) returns a synthetic
  // clientSecret + isLive:false so the mobile UI walk doesn't crash.
  async buildCashinIntent(
    amountUsd: string,
    method: 'apple_pay' | 'card' | 'ach'
  ): Promise<CashinIntent> {
    return this.request('/wallet/cashin/intent', {
      method: 'POST',
      body: JSON.stringify({ amountUsd, method }),
    });
  }

  // Push token registration (#81) — mobile registers its Expo push
  // token with notify-service so server-initiated pushes find this
  // device. Idempotent on the backend; safe to retry.
  async registerPushToken(args: {
    userId: string;
    expoPushToken: string;
    platform?: 'ios' | 'android' | 'web';
  }): Promise<{ registered: boolean }> {
    return this.request('/notify/push/register', {
      method: 'POST',
      body: JSON.stringify(args),
    });
  }

  // Swap quote (#89) — Pyth Hermes USD price anchor + Jupiter v6 route.
  // Stub fallback when external APIs are unreachable; isLive flag tells
  // the UI whether to mark the rate "indicative".
  async getSwapQuote(
    amountUsdc: string,
    opts?: { toMint?: string; slippageBps?: number }
  ): Promise<SwapQuote> {
    const params = new URLSearchParams({ amountUsdc });
    if (opts?.toMint) params.set('toMint', opts.toMint);
    if (opts?.slippageBps !== undefined) {
      params.set('slippageBps', String(opts.slippageBps));
    }
    return this.request(`/wallet/swap/quote?${params.toString()}`);
  }

  // Convenience for the mobile "Send to wallet" flow. Calls buildSendIntent,
  // hands the serializedTransaction off to the Privy MPC SDK for signing,
  // then submits to Solana RPC. The signer + rpc params are injected so the
  // mobile screen passes the Privy MPC sign(tx) function + a Connection
  // configured for the Sovereign's Solana RPC endpoint. Per ADR 0020.
  async signAndSubmitUsdcSend(
    recipientWallet: string,
    amountUsdc: string,
    privySign: (base64UnsignedTx: string) => Promise<string>,
    submitRaw: (base64SignedTx: string) => Promise<string>
  ): Promise<{ intent: SendIntent; txSignature: string }> {
    const intent = await this.buildSendIntent(recipientWallet, amountUsdc);
    const signedB64 = await privySign(intent.serializedTransaction);
    const txSignature = await submitRaw(signedB64);
    return { intent, txSignature };
  }

  // ==========================================
  // Transfers
  // ==========================================

  async createTransfer(data: CreateTransferRequest): Promise<Transfer> {
    return this.request('/transfers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTransfer(id: string): Promise<Transfer> {
    return this.request(`/transfers/${id}`);
  }

  async listTransfers(params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ transfers: Transfer[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    const queryString = query.toString();
    return this.request(`/transfers${queryString ? `?${queryString}` : ''}`);
  }

  async cancelTransfer(id: string): Promise<Transfer> {
    return this.request(`/transfers/${id}/cancel`, { method: 'POST' });
  }

  // ==========================================
  // FX Rates
  // ==========================================

  async getRate(
    from: string,
    to: string
  ): Promise<{ rate: string; timestamp: string }> {
    return this.request(`/fx/rate?from=${from}&to=${to}`);
  }

  async getQuote(data: {
    amount: string;
    fromCurrency: string;
    toCurrency: string;
  }): Promise<FxQuote> {
    return this.request('/fx/quote', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// ==========================================
// Types
// ==========================================

export interface User {
  id: string;
  phone: string;
  name?: string;
  kycTier: number;
  walletAddress: string;
  createdAt: string;
}

export interface BalanceSnapshot {
  walletAddress: string;
  USDC: string;
  vUSDC: string;
  PING: string;
  totalUsdValue: string;
}

export interface VaultPosition {
  walletAddress: string;
  vUsdcBalance: string;
  earnedPingLifetime: string;
  apyDisplay: string;
}

export interface CashinIntent {
  clientSecret: string;
  amount: number;
  currency: string;
  publishableKey: string;
  ephemeralKey?: string;
  customerId?: string;
  isLive: boolean;
}

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  rate: string;
  inputPriceUsd: string | null;
  outputPriceUsd: string | null;
  route: string[];
  feeBps: number;
  slippageBps: number;
  isLive: boolean;
}

export interface Transfer {
  id: string;
  senderId: string;
  recipientPhone: string;
  amount: string;
  currency: string;
  localAmount?: string;
  localCurrency?: string;
  status: TransferStatus;
  claimCode?: string;
  claimUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransferStatus =
  | 'pending'
  | 'confirmed'
  | 'claimed'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'failed';

export interface CreateTransferRequest {
  recipientPhone: string;
  amount: string;
  currency: string;
  note?: string;
}

export interface FxQuote {
  fromAmount: string;
  fromCurrency: string;
  toAmount: string;
  toCurrency: string;
  rate: string;
  fee: string;
  expiresAt: string;
}

// Pillar 4 send-side intent shape — backend builds + mobile signs via Privy MPC.
// Single source of truth lives in @ping/types per ADR 0020.
export type { SendIntent } from '@ping/types';

// ==========================================
// Error Handling
// ==========================================

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ==========================================
// Export singleton
// ==========================================

export const api = new ApiClient();
