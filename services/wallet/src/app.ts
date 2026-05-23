import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';

import { loadConfig } from '@ping/config';
import { logger } from './utils/logger';
import { walletRoutes } from './controllers/wallet.controller';
import { healthRoutes } from './controllers/health.controller';
import { errorHandler } from './utils/errors';

export async function buildApp() {
  const config = loadConfig();
  const app = Fastify({
    logger: logger as never,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    genReqId: () => `req_${Date.now().toString(36)}`,
  });

  await app.register(helmet);
  await app.register(cors, { origin: true, credentials: true });
  await app.register(jwt, { secret: config.JWT_SECRET });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });

  app.setErrorHandler(errorHandler as never);
  app.addHook('onRequest', async (request) => {
    request.log.info({ method: request.method, url: request.url }, 'Incoming request');
  });

  await app.register(healthRoutes);
  await app.register(walletRoutes, { prefix: '/wallet' });

  return app;
}
