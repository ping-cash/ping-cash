/**
 * Per-user Expo push token store (#81).
 *
 * Tokens are emitted by the mobile app's expo-notifications layer
 * after permission grant. Backend stores them keyed by userId in
 * Redis. On a claim-completed event the claim-service tells notify-
 * service which userId to push, and we look up the token here.
 *
 * Why Redis: tokens are short-lived (Expo rotates them on app
 * reinstall + OS upgrade), cluster-shared (any notify replica can
 * pick up an event), and lookup volume is small. A relational DB
 * would work too but Redis matches the rest of the notify-service
 * surface area.
 *
 * Stub-safe: if REDIS_URL is unset, every read/write degrades to a
 * no-op so unit tests + dev runs don't crash.
 */
import { loadConfig } from '@ping/config';
import IORedis, { type Redis } from 'ioredis';

import { logger } from '../utils/logger';

const config = loadConfig();

const TOKEN_KEY_PREFIX = 'push:token:';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90; // 90d — Expo rotates, but cap stale

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = config.REDIS_URL;
  if (!url) return null;
  _redis = new IORedis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  _redis.on('error', err => {
    logger.warn({ err: err.message }, 'Push-token redis error');
  });
  return _redis;
}

export async function savePushToken(args: {
  userId: string;
  expoPushToken: string;
  platform?: 'ios' | 'android' | 'web';
}): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const key = `${TOKEN_KEY_PREFIX}${args.userId}`;
  await redis.hset(key, {
    token: args.expoPushToken,
    platform: args.platform ?? 'unknown',
    updatedAt: String(Math.floor(Date.now() / 1000)),
  });
  await redis.expire(key, TOKEN_TTL_SECONDS);
  logger.info(
    { userId: args.userId, platform: args.platform },
    'Push token saved'
  );
}

export async function getPushToken(userId: string): Promise<{
  token: string;
  platform?: string;
  updatedAt?: number;
} | null> {
  const redis = getRedis();
  if (!redis) return null;
  const key = `${TOKEN_KEY_PREFIX}${userId}`;
  const raw = await redis.hgetall(key);
  if (!raw.token) return null;
  return {
    token: raw.token,
    platform: raw.platform,
    updatedAt: raw.updatedAt ? parseInt(raw.updatedAt, 10) : undefined,
  };
}

export async function deletePushToken(userId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(`${TOKEN_KEY_PREFIX}${userId}`);
}
