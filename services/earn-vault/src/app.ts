import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';

import { healthRoutes } from './controllers/health.controller';
import { vaultRoutes } from './controllers/vault.controller';
import { errorHandler } from './utils/errors';
import { logger } from './utils/logger';

export async function buildApp() {
  const app = Fastify({ logger: logger as never });
  await app.register(helmet);
  await app.register(cors, { origin: true });
  app.setErrorHandler(errorHandler as never);
  await app.register(healthRoutes);
  await app.register(vaultRoutes);
  return app;
}
