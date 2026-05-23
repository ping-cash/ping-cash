import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { logger } from './utils/logger';
import { complianceRoutes } from './controllers/compliance.controller';
import { healthRoutes } from './controllers/health.controller';
import { errorHandler } from './utils/errors';

export async function buildApp() {
  const app = Fastify({ logger: logger as never });
  await app.register(helmet);
  await app.register(cors, { origin: true });
  app.setErrorHandler(errorHandler as never);
  await app.register(healthRoutes);
  await app.register(complianceRoutes, { prefix: '/compliance' });
  return app;
}
