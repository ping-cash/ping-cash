import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { logger } from './utils/logger';
import { tokenRoutes } from './controllers/token.controller';
import { healthRoutes } from './controllers/health.controller';
import { errorHandler } from './utils/errors';

export async function buildApp() {
  const app = Fastify({ logger });
  await app.register(helmet);
  await app.register(cors, { origin: true });
  app.setErrorHandler(errorHandler);
  await app.register(healthRoutes);
  await app.register(tokenRoutes, { prefix: '/token' });
  return app;
}
