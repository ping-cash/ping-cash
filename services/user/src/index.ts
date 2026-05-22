import { loadConfig } from '@ping/config';
import { buildApp } from './app';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';

async function main() {
  const config = loadConfig();

  logger.info({ env: config.NODE_ENV }, 'Starting user-service');

  await prisma.$connect();
  logger.info('Connected to PostgreSQL');

  const app = await buildApp();

  try {
    await app.listen({
      port: config.API_PORT ?? 3002,
      host: '0.0.0.0',
    });
    logger.info({ port: config.API_PORT ?? 3002 }, 'Server listening');
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down...');
    await app.close();
    await prisma.$disconnect();
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
