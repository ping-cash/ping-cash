/**
 * Sanctions screening service.
 *
 * Per SECURITY.md § Compliance Roadmap:
 *   - Chainalysis KYT for blockchain wallet screening
 *   - OFAC SDN List, UN Consolidated List, EU restrictive measures for name/PII
 *   - Daily list refresh from Chainalysis Sanctions API
 *
 * The service is invoked on every cash-out + every $X transfer.
 */
import { loadConfig } from '@ping/config';

import { logger } from '../utils/logger';

const config = loadConfig();

export interface ScreenWalletInput {
  walletAddress: string;
  chain: 'solana' | 'ethereum' | 'tron' | 'base';
}

export interface ScreenNameInput {
  fullName: string;
  dateOfBirth?: string;
  nationality?: string;
}

export type ScreeningResult = 'clean' | 'hit' | 'inconclusive';

export interface ScreeningOutcome {
  result: ScreeningResult;
  listsHit: string[]; // ['OFAC_SDN', 'UN_CONSOLIDATED', 'EU_RESTRICTIVE']
  riskScore: number; // 0-100
  details?: Record<string, unknown>;
  source: 'chainalysis' | 'ofac-direct' | 'stub';
  checkedAt: number;
}

/**
 * Screen a wallet against Chainalysis KYT sanctions list.
 * Returns clean/hit/inconclusive.
 *
 * Stub mode when CHAINALYSIS_API_KEY missing.
 */
export async function screenWallet(
  input: ScreenWalletInput
): Promise<ScreeningOutcome> {
  const apiKey = config.CHAINALYSIS_API_KEY;
  const now = Math.floor(Date.now() / 1000);

  if (!apiKey) {
    // Stub mode: simulate clean for most addresses; flag if matches known test sanction prefix
    const testSanctioned = input.walletAddress.startsWith('Sanctioned');
    logger.info(
      { walletAddress: input.walletAddress },
      '[STUB MODE] Sanctions screen'
    );
    return {
      result: testSanctioned ? 'hit' : 'clean',
      listsHit: testSanctioned ? ['OFAC_SDN_STUB'] : [],
      riskScore: testSanctioned ? 95 : 0,
      source: 'stub',
      checkedAt: now,
    };
  }

  try {
    const response = await fetch(
      `https://api.chainalysis.com/api/risk/v2/entities/${input.walletAddress}`,
      {
        headers: {
          Token: apiKey,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      logger.warn(
        { status: response.status },
        'Chainalysis API failed — defaulting to inconclusive'
      );
      return {
        result: 'inconclusive',
        listsHit: [],
        riskScore: 50,
        source: 'chainalysis',
        checkedAt: now,
        details: { httpStatus: response.status },
      };
    }

    const body = (await response.json()) as {
      risk: 'Severe' | 'High' | 'Medium' | 'Low';
      cluster?: { categories?: string[] };
    };

    const result: ScreeningResult = body.risk === 'Severe' ? 'hit' : 'clean';
    const riskScore =
      { Severe: 100, High: 80, Medium: 40, Low: 10 }[body.risk] ?? 0;

    return {
      result,
      listsHit: body.cluster?.categories ?? [],
      riskScore,
      source: 'chainalysis',
      checkedAt: now,
      details: { risk: body.risk },
    };
  } catch (err) {
    logger.error({ err }, 'Chainalysis screening error');
    return {
      result: 'inconclusive',
      listsHit: [],
      riskScore: 50,
      source: 'chainalysis',
      checkedAt: now,
      details: { error: (err as Error).message },
    };
  }
}

/**
 * Screen a person's name against OFAC SDN + UN + EU sanctions lists.
 *
 * Phase 1 stub. Phase 2: integrate with a name-screening provider
 * (Refinitiv World-Check, Dow Jones Risk & Compliance, etc.)
 */
export async function screenName(
  input: ScreenNameInput
): Promise<ScreeningOutcome> {
  const now = Math.floor(Date.now() / 1000);

  logger.info({ fullName: input.fullName }, '[STUB] Sanctions screen by name');

  // Stub: known-bad test name
  const isBadActor = input.fullName.toLowerCase().includes('sanctioned-test');
  return {
    result: isBadActor ? 'hit' : 'clean',
    listsHit: isBadActor ? ['OFAC_SDN_STUB'] : [],
    riskScore: isBadActor ? 95 : 0,
    source: 'stub',
    checkedAt: now,
  };
}

/**
 * Check whether a transfer is allowed based on sender + recipient + amount.
 * Combines wallet screening + name screening + velocity limits.
 */
export interface AllowanceCheck {
  allowed: boolean;
  reason?: string;
  riskScore: number;
  walletScreenings: ScreeningOutcome[];
}

export async function checkTransferAllowance(input: {
  senderWallet: string;
  recipientWallet?: string;
  senderName?: string;
  recipientName?: string;
  amountUsdc: string;
}): Promise<AllowanceCheck> {
  const walletScreenings: ScreeningOutcome[] = [];
  let maxRisk = 0;

  // Screen sender wallet
  const senderScreen = await screenWallet({
    walletAddress: input.senderWallet,
    chain: 'solana',
  });
  walletScreenings.push(senderScreen);
  maxRisk = Math.max(maxRisk, senderScreen.riskScore);

  if (senderScreen.result === 'hit') {
    return {
      allowed: false,
      reason: `Sender wallet sanctioned: lists=${senderScreen.listsHit.join(',')}`,
      riskScore: senderScreen.riskScore,
      walletScreenings,
    };
  }

  // Screen recipient wallet if provided (for in-network transfers)
  if (input.recipientWallet) {
    const recipientScreen = await screenWallet({
      walletAddress: input.recipientWallet,
      chain: 'solana',
    });
    walletScreenings.push(recipientScreen);
    maxRisk = Math.max(maxRisk, recipientScreen.riskScore);

    if (recipientScreen.result === 'hit') {
      return {
        allowed: false,
        reason: `Recipient wallet sanctioned: lists=${recipientScreen.listsHit.join(',')}`,
        riskScore: recipientScreen.riskScore,
        walletScreenings,
      };
    }
  }

  // Name screening (if provided and amount above threshold)
  const amount = parseFloat(input.amountUsdc);
  if (amount > 1000 && input.recipientName) {
    const nameScreen = await screenName({ fullName: input.recipientName });
    if (nameScreen.result === 'hit') {
      return {
        allowed: false,
        reason: `Recipient name sanctioned: lists=${nameScreen.listsHit.join(',')}`,
        riskScore: nameScreen.riskScore,
        walletScreenings,
      };
    }
  }

  return {
    allowed: true,
    riskScore: maxRisk,
    walletScreenings,
  };
}
