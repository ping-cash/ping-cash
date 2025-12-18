import Redis from 'ioredis';
import { getConfig } from '@cash/config';
import { logger } from './logger';

const config = getConfig();

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      logger.error('Redis connection failed after 3 retries');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis error');
});

export async function connectRedis(): Promise<void> {
  // Connection is automatic, just verify it works
  await redis.ping();
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}
