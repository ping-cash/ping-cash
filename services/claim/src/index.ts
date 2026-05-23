import { loadConfig } from '@ping/config';

import { buildApp } from './app';
import { logger } from './utils/logger';
import { connectRedis, disconnectRedis } from './utils/redis';

async function main() {
  const config = loadConfig();
  logger.info({ env: config.NODE_ENV }, 'Starting claim-service');

  await connectRedis();
  logger.info('Connected to Redis');

  const app = await buildApp();

  try {
    await app.listen({
      port: config.API_PORT ?? 3006,
      host: '0.0.0.0',
    });
    logger.info({ port: config.API_PORT ?? 3006 }, 'Server listening');
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down...');
    await app.close();
    await disconnectRedis();
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
