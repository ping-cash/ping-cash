import { loadConfig } from '@ping/config';

import { buildApp } from './app';
import { logger } from './utils/logger';

async function main() {
  const config = loadConfig();
  logger.info({ env: config.NODE_ENV }, 'Starting gamification-service');
  const app = await buildApp();
  await app.listen({ port: config.API_PORT ?? 3009, host: '0.0.0.0' });
  logger.info({ port: config.API_PORT ?? 3009 }, 'Server listening');

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
