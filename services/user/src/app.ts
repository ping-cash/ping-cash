import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { loadConfig } from '@ping/config';
import Fastify from 'fastify';

import { healthRoutes } from './controllers/health.controller';
import { userRoutes } from './controllers/users.controller';
import { errorHandler } from './utils/errors';
import { logger } from './utils/logger';

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

  await app.register(jwt, {
    secret: config.JWT_SECRET,
    verify: { allowedIss: undefined },
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: request => request.ip,
  });

  app.setErrorHandler(errorHandler as never);

  app.addHook('onRequest', async request => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
      },
      'Incoming request'
    );
  });

  await app.register(healthRoutes);
  await app.register(userRoutes, { prefix: '/users' });

  return app;
}
