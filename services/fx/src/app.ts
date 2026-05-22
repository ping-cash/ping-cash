import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import { loadConfig } from '@ping/config';
import { logger } from './utils/logger';
import { fxRoutes } from './controllers/fx.controller';
import { healthRoutes } from './controllers/health.controller';
import { errorHandler } from './utils/errors';

export async function buildApp() {
  const _config = loadConfig();
  const app = Fastify({
    logger,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    genReqId: () => `req_${Date.now().toString(36)}`,
  });

  await app.register(helmet);
  await app.register(cors, { origin: true, credentials: true });
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

  app.setErrorHandler(errorHandler);
  app.addHook('onRequest', async (request) => {
    request.log.info({ method: request.method, url: request.url }, 'Incoming request');
  });

  await app.register(healthRoutes);
  await app.register(fxRoutes, { prefix: '/fx' });

  return app;
}
