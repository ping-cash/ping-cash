import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import { logger } from './utils/logger';
import { redis } from './utils/redis';
import { claimRoutes } from './controllers/claim.controller';
import { healthRoutes } from './controllers/health.controller';
import { errorHandler } from './utils/errors';

export async function buildApp() {
  const app = Fastify({
    logger,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    genReqId: () => `req_${Date.now().toString(36)}`,
  });

  await app.register(helmet);
  await app.register(cors, { origin: true, credentials: true });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute', redis });

  app.setErrorHandler(errorHandler);
  app.addHook('onRequest', async (request) => {
    request.log.info({ method: request.method, url: request.url }, 'Incoming request');
  });

  await app.register(healthRoutes);
  await app.register(claimRoutes, { prefix: '/claims' });

  return app;
}
