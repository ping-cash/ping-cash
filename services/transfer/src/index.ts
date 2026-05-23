import { loadConfig } from '@ping/config';

import { buildApp } from './app';
import { connectKafka, disconnectKafka } from './events/kafka';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';
import { connectRedis, disconnectRedis } from './utils/redis';

async function main() {
  // Load and validate configuration
  const config = loadConfig();

  logger.info({ env: config.NODE_ENV }, 'Starting transfer-service');

  // Connect to external services
  await Promise.all([connectKafka(), connectRedis(), prisma.$connect()]);

  logger.info('Connected to all external services');

  // Build and start the HTTP server
  const app = await buildApp();

  try {
    await app.listen({
      port: config.API_PORT,
      host: '0.0.0.0',
    });
    logger.info({ port: config.API_PORT }, 'Server listening');
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down...');

    await app.close();
    await Promise.all([
      disconnectKafka(),
      disconnectRedis(),
      prisma.$disconnect(),
    ]);

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
