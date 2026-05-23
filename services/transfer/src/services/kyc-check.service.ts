import { KycClient } from '@ping/kyc-client';

import { logger } from '../utils/logger';

const TIER1_USDC_THRESHOLD = 200;
const TIER2_USDC_THRESHOLD = 1_000;

export function requiredTierForAmount(amountUsdc: number): 0 | 1 | 2 {
  if (amountUsdc >= TIER2_USDC_THRESHOLD) return 2;
  if (amountUsdc >= TIER1_USDC_THRESHOLD) return 1;
  return 0;
}

let kycClient: KycClient | null = null;
function getClient(): KycClient | null {
  if (!process.env.KYC_SERVICE_URL) return null;
  if (!kycClient) {
    kycClient = new KycClient({
      baseUrl: process.env.KYC_SERVICE_URL,
      serviceToken: process.env.KYC_SERVICE_TOKEN,
    });
  }
  return kycClient;
}

export class KycTierInsufficientError extends Error {
  constructor(
    public readonly currentTier: 0 | 1 | 2,
    public readonly requiredTier: 0 | 1 | 2
  ) {
    super(`KYC tier ${currentTier} is below required ${requiredTier}`);
    this.name = 'KycTierInsufficientError';
  }
}

export async function ensureKycForTransfer(
  userId: string,
  amountUsdc: number
): Promise<void> {
  const required = requiredTierForAmount(amountUsdc);
  if (required === 0) return;

  const client = getClient();
  if (!client) {
    logger.warn(
      { userId, amountUsdc, required },
      '[STUB] KYC_SERVICE_URL unset — allowing transfer without tier check'
    );
    return;
  }

  const state = await client.getState(userId);
  if (state.kycTier < required) {
    throw new KycTierInsufficientError(state.kycTier, required);
  }
}
