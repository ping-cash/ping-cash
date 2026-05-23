/**
 * Web-claim API client (browser-side fetch).
 *
 * Talks directly to claim-service endpoints:
 *   GET /claims/:code
 *   POST /claims/:code/otp
 *   POST /claims/:code/verify
 *   POST /claims/:code/cashout
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.ping.cash';

export interface ClaimPublic {
  code: string;
  status: 'pending' | 'verified' | 'claimed' | 'expired' | 'cancelled';
  sender: { name?: string };
  amount: {
    value: string;
    currency: string;
    localValue?: string;
    localCurrency?: string;
    fxRate?: number;
  };
  recipientPhoneMasked: string;
  expiresAt: number;
  expiresIn: number;
}

export interface CashoutMethod {
  method: string;
  estimatedTime: string;
  fee: string;
}

export interface VerifyResult {
  verified: true;
  verificationToken: string;
  cashoutMethods: CashoutMethod[];
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message ?? `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getClaim(code: string): Promise<ClaimPublic> {
  return request<ClaimPublic>(`/claims/${code}`);
}

export async function requestOtp(
  code: string
): Promise<{ sent: true; expiresIn: number }> {
  return request(`/claims/${code}/otp`, { method: 'POST' });
}

export async function verifyOtp(
  code: string,
  otpCode: string
): Promise<VerifyResult> {
  return request<VerifyResult>(`/claims/${code}/verify`, {
    method: 'POST',
    body: JSON.stringify({ code: otpCode }),
  });
}

export async function executeCashout(input: {
  code: string;
  method: string;
  account: string;
  accountName?: string;
}): Promise<{ status: 'processing'; offrampReference: string }> {
  return request(`/claims/${input.code}/cashout`, {
    method: 'POST',
    body: JSON.stringify({
      method: input.method,
      account: input.account,
      accountName: input.accountName,
    }),
  });
}
