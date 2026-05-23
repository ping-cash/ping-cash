import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { healthRoutes } from './controllers/health.controller';
import { offrampRoutes } from './controllers/offramp.controller';
import { errorHandler } from './utils/errors';
import { logger } from './utils/logger';

export async function buildApp() {
  const app = Fastify({
    logger: logger as never,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    genReqId: () => `req_${Date.now().toString(36)}`,
  });

  await app.register(helmet);
  await app.register(cors, { origin: true, credentials: true });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });

  app.setErrorHandler(errorHandler as never);
  app.addHook('onRequest', async request => {
    request.log.info(
      { method: request.method, url: request.url },
      'Incoming request'
    );
  });

  await app.register(healthRoutes);
  await app.register(offrampRoutes, { prefix: '/offramp' });

  return app;
}
