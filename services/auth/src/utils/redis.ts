import { loadConfig } from '@ping/config';
import Redis from 'ioredis';

import { logger } from './logger';

const config = loadConfig();

export const redis = new Redis(config.REDIS_URL ?? 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redis.on('error', err => {
  logger.error({ err }, 'Redis connection error');
});

export async function connectRedis() {
  await redis.connect();
}

export async function disconnectRedis() {
  await redis.quit();
}

/**
 * OTP session helpers
 * Sessions keyed by sessionId (returned from /auth/init).
 * TTL = 10 minutes (OTP_TTL_SECONDS).
 */
const OTP_TTL_SECONDS = 600;

export interface OtpSession {
  phone: string;
  phoneHash: string;
  twilioSid: string;
  attempts: number;
  createdAt: number;
}

export async function storeOtpSession(
  sessionId: string,
  data: OtpSession
): Promise<void> {
  await redis.set(
    `otp:${sessionId}`,
    JSON.stringify(data),
    'EX',
    OTP_TTL_SECONDS
  );
}

export async function readOtpSession(
  sessionId: string
): Promise<OtpSession | null> {
  const raw = await redis.get(`otp:${sessionId}`);
  return raw ? (JSON.parse(raw) as OtpSession) : null;
}

export async function incrementOtpAttempts(sessionId: string): Promise<number> {
  const session = await readOtpSession(sessionId);
  if (!session) return 0;
  session.attempts += 1;
  await storeOtpSession(sessionId, session);
  return session.attempts;
}

export async function deleteOtpSession(sessionId: string): Promise<void> {
  await redis.del(`otp:${sessionId}`);
}

/**
 * Refresh token storage (jti → user info)
 * TTL = 7 days
 */
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface RefreshTokenRecord {
  userId: string;
  phoneHash: string;
  issuedAt: number;
  deviceId?: string;
}

export async function storeRefreshToken(
  jti: string,
  data: RefreshTokenRecord
): Promise<void> {
  await redis.set(
    `refresh:${jti}`,
    JSON.stringify(data),
    'EX',
    REFRESH_TTL_SECONDS
  );
}

export async function readRefreshToken(
  jti: string
): Promise<RefreshTokenRecord | null> {
  const raw = await redis.get(`refresh:${jti}`);
  return raw ? (JSON.parse(raw) as RefreshTokenRecord) : null;
}

export async function revokeRefreshToken(jti: string): Promise<void> {
  await redis.del(`refresh:${jti}`);
}

/**
 * Rate-limit IP tracker for /auth/init
 * Max 5 init calls per IP per 10 minutes.
 */
const INIT_RATE_WINDOW = 10 * 60; // seconds
const INIT_RATE_MAX = 5;

export async function checkInitRateLimit(
  ip: string
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const key = `ratelimit:init:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, INIT_RATE_WINDOW);
  }
  const ttl = await redis.ttl(key);
  return {
    allowed: count <= INIT_RATE_MAX,
    remaining: Math.max(0, INIT_RATE_MAX - count),
    resetIn: ttl,
  };
}
