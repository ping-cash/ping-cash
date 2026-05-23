import { loadConfig } from '@ping/config';
import Redis from 'ioredis';

import { logger } from './logger';

const config = loadConfig();

export const redis = new Redis(config.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redis.on('error', err => logger.error({ err }, 'Redis error'));

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}

/** Claim records — keyed by claim code, 7-day TTL */
const CLAIM_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface ClaimRecord {
  code: string;
  transferId: string;
  senderId: string;
  senderName?: string;
  recipientPhone: string;
  recipientPhoneHash: string;
  amount: {
    value: string;
    currency: string;
    localValue?: string;
    localCurrency?: string;
    fxRate?: number;
  };
  status: 'pending' | 'verified' | 'claimed' | 'expired' | 'cancelled';
  verification: {
    attempts: number;
    maxAttempts: number;
    lockedUntil?: number;
  };
  cashout?: {
    method: string;
    account?: string;
    selectedAt: number;
  };
  metadata?: Record<string, unknown>;
  createdAt: number;
  expiresAt: number;
}

export async function storeClaim(
  code: string,
  record: ClaimRecord
): Promise<void> {
  await redis.set(
    `claim:${code}`,
    JSON.stringify(record),
    'EX',
    CLAIM_TTL_SECONDS
  );
}

export async function readClaim(code: string): Promise<ClaimRecord | null> {
  const raw = await redis.get(`claim:${code}`);
  return raw ? (JSON.parse(raw) as ClaimRecord) : null;
}

export async function updateClaim(
  code: string,
  updates: Partial<ClaimRecord>
): Promise<ClaimRecord | null> {
  const current = await readClaim(code);
  if (!current) return null;
  const updated = { ...current, ...updates };
  await storeClaim(code, updated);
  return updated;
}

export async function deleteClaim(code: string): Promise<void> {
  await redis.del(`claim:${code}`);
}

/** OTP rate limit — claim-side, 5 attempts per claim */
export async function checkOtpRateLimit(
  code: string,
  ip: string
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `claim-otp-rl:${code}:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 600); // 10 minutes
  }
  return {
    allowed: count <= 5,
    remaining: Math.max(0, 5 - count),
  };
}

/** IP-level rate limit on claim retrievals — anti-scrape */
export async function checkClaimViewRateLimit(ip: string): Promise<boolean> {
  const key = `claim-view-rl:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 3600); // 1 hour
  }
  return count <= 100; // 100 claim views per hour per IP
}
