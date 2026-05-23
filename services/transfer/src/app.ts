import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { healthRoutes } from './controllers/health.controller';
import { transferRoutes } from './controllers/transfer.controller';
import { errorHandler } from './utils/errors';
import { logger } from './utils/logger';
import { redis } from './utils/redis';

export async function buildApp() {
  const app = Fastify({
    logger: logger as never,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    genReqId: () => `req_${Date.now().toString(36)}`,
  });

  // Security
  await app.register(helmet);
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: redis,
    keyGenerator: request => {
      // Use user ID if authenticated, otherwise IP
      const userId = (request as any).userId;
      return userId || request.ip;
    },
  });

  // Error handling
  app.setErrorHandler(errorHandler as never);

  // Request logging
  app.addHook('onRequest', async (request) => {
    request.log.info({
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
    }, 'Incoming request');
  });

  // Response logging
  app.addHook('onResponse', async (request, reply) => {
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    }, 'Request completed');
  });

  // Routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(transferRoutes, { prefix: '/transfers' });

  return app;
}
