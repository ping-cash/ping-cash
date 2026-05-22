/**
 * User profile service — CRUD + tier read.
 */
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { UserErrors } from '../utils/errors';
import { computeTier, type Tier } from './tier.service';

export interface UserPublic {
  id: string;
  walletAddress: string;
  phoneMasked: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  language: string;
  country: string | null;
  kycTier: number;
  kycStatus: 'none' | 'verified' | 'pending' | 'rejected';
  tier: Tier;
  pingPointsBalance: {
    free: string;
    welcomeLocked: string;
    welcomeUnlocked: string;
    total: string;
  };
  limits: {
    dailyLimit: string;
    monthlyLimit: string;
    dailyUsed: string;
    monthlyUsed: string;
    dailyRemaining: string;
    monthlyRemaining: string;
  };
  stats: {
    totalSent: string;
    totalReceived: string;
    transferCount: number;
  };
  createdAt: string;
}

/**
 * Create a new user record from a verified auth event (called by auth-service
 * after Privy wallet is bound).
 */
export async function createOrFetch(input: {
  privyUserId: string;
  walletAddress: string;
  phoneHash: string;
  phoneEncrypted?: string;
  country?: string;
}): Promise<{ user: UserPublic; isNewUser: boolean }> {
  // Try to find existing user by privyUserId
  let user = await prisma.user.findUnique({
    where: { privyUserId: input.privyUserId },
  });

  let isNewUser = false;

  if (!user) {
    user = await prisma.user.create({
      data: {
        privyUserId: input.privyUserId,
        walletAddress: input.walletAddress,
        phoneHash: input.phoneHash,
        phoneEncrypted: input.phoneEncrypted,
        country: input.country,
        language: 'en',
      },
    });
    isNewUser = true;
    logger.info({ userId: user.id, walletAddress: user.walletAddress }, 'New user created');
  } else {
    logger.info({ userId: user.id }, 'Existing user fetched');
  }

  return { user: toPublic(user), isNewUser };
}

export async function getById(userId: string): Promise<UserPublic> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw UserErrors.NotFound();
  return toPublic(user);
}

export async function getByWallet(walletAddress: string): Promise<UserPublic | null> {
  const user = await prisma.user.findUnique({ where: { walletAddress } });
  return user ? toPublic(user) : null;
}

export async function getByPhoneHash(phoneHash: string): Promise<UserPublic | null> {
  const user = await prisma.user.findUnique({ where: { phoneHash } });
  return user ? toPublic(user) : null;
}

/**
 * Update user profile.
 */
export async function updateProfile(
  userId: string,
  patch: Partial<{ displayName: string; email: string; avatarUrl: string; language: string; country: string }>,
): Promise<UserPublic> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: patch,
  });
  return toPublic(updated);
}

/**
 * Sync KYC tier — called by KYC service webhook.
 */
export async function updateKycTier(userId: string, tier: number): Promise<void> {
  // Tier-based limits (per BUSINESS-STRATEGY.md § KYC Tiers)
  const limits = {
    1: { daily: 200, monthly: 1000 },
    2: { daily: 2000, monthly: 10000 },
    3: { daily: 10000, monthly: 50000 },
  };

  const newLimits = limits[tier as 1 | 2 | 3] ?? limits[1];

  await prisma.user.update({
    where: { id: userId },
    data: {
      kycTier: tier,
      kycVerifiedAt: new Date(),
      dailyLimitUsdc: new Decimal(newLimits.daily),
      monthlyLimitUsdc: new Decimal(newLimits.monthly),
    },
  });

  logger.info({ userId, tier, newLimits }, 'KYC tier updated');
}

function toPublic(user: {
  id: string;
  walletAddress: string;
  phoneHash: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  language: string;
  country: string | null;
  kycTier: number;
  kycVerifiedAt: Date | null;
  tier: string;
  pingPointsFreeBalance: Decimal;
  pingPointsWelcomeLocked: Decimal;
  pingPointsWelcomeUnlocked: Decimal;
  dailyLimitUsdc: Decimal;
  monthlyLimitUsdc: Decimal;
  dailyUsedUsdc: Decimal;
  monthlyUsedUsdc: Decimal;
  totalSentUsdc: Decimal;
  totalReceivedUsdc: Decimal;
  transferCount: number;
  createdAt: Date;
}): UserPublic {
  const total =
    Number(user.pingPointsFreeBalance) +
    Number(user.pingPointsWelcomeLocked) +
    Number(user.pingPointsWelcomeUnlocked);

  // Re-derive tier from balances (canonical, server-authoritative)
  const derivedTier = computeTier(
    user.pingPointsFreeBalance,
    user.pingPointsWelcomeLocked,
    user.pingPointsWelcomeUnlocked,
  );

  return {
    id: user.id,
    walletAddress: user.walletAddress,
    phoneMasked: `+** *** *** **${user.phoneHash.slice(-2)}`,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    language: user.language,
    country: user.country,
    kycTier: user.kycTier,
    kycStatus: user.kycVerifiedAt ? 'verified' : 'none',
    tier: derivedTier,
    pingPointsBalance: {
      free: user.pingPointsFreeBalance.toString(),
      welcomeLocked: user.pingPointsWelcomeLocked.toString(),
      welcomeUnlocked: user.pingPointsWelcomeUnlocked.toString(),
      total: total.toString(),
    },
    limits: {
      dailyLimit: user.dailyLimitUsdc.toString(),
      monthlyLimit: user.monthlyLimitUsdc.toString(),
      dailyUsed: user.dailyUsedUsdc.toString(),
      monthlyUsed: user.monthlyUsedUsdc.toString(),
      dailyRemaining: (Number(user.dailyLimitUsdc) - Number(user.dailyUsedUsdc)).toString(),
      monthlyRemaining: (Number(user.monthlyLimitUsdc) - Number(user.monthlyUsedUsdc)).toString(),
    },
    stats: {
      totalSent: user.totalSentUsdc.toString(),
      totalReceived: user.totalReceivedUsdc.toString(),
      transferCount: user.transferCount,
    },
    createdAt: user.createdAt.toISOString(),
  };
}
