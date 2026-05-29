import { loadConfig } from '@ping/config';

import { buildApp } from './app';
import { startOfacRefreshLoop } from './services/ofac-screener.service';
import { logger } from './utils/logger';

async function main() {
  const config = loadConfig();
  logger.info({ env: config.NODE_ENV }, 'Starting compliance-service');
  const app = await buildApp();
  await app.listen({ port: config.API_PORT ?? 3011, host: '0.0.0.0' });
  logger.info({ port: config.API_PORT ?? 3011 }, 'Server listening');

  // Kick off the OFAC SDN refresh loop (#75). Initial pull + 4h timer.
  // Stub-safe — when REDIS_URL is unset or unreachable the loop logs
  // the failure but doesn't crash the service.
  const stopOfacLoop = startOfacRefreshLoop();

  const shutdown = async () => {
    stopOfacLoop();
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
