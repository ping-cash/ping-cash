import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { loadConfig } from '@ping/config';
import Fastify from 'fastify';

import { authRoutes } from './controllers/auth.controller';
import { healthRoutes } from './controllers/health.controller';
import { errorHandler } from './utils/errors';
import { logger } from './utils/logger';
import { redis } from './utils/redis';

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

  // JWT signing for issued access + refresh tokens
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_ACCESS_TOKEN_TTL ?? '15m' },
  });

  // Tier 1 rate limiting — per /auth/init (5/10min) per IP
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (request) => request.ip,
  });

  app.setErrorHandler(errorHandler as never);

  app.addHook('onRequest', async (request) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
      },
      'Incoming request',
    );
  });

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/auth' });

  return app;
}
