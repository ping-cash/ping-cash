import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';

import { gamificationRoutes } from './controllers/gamification.controller';
import { healthRoutes } from './controllers/health.controller';
import { errorHandler } from './utils/errors';
import { logger } from './utils/logger';

export async function buildApp() {
  const app = Fastify({ logger: logger as never });
  await app.register(helmet);
  await app.register(cors, { origin: true });
  app.setErrorHandler(errorHandler as never);
  await app.register(healthRoutes);
  await app.register(gamificationRoutes, { prefix: '/gamification' });
  return app;
}
