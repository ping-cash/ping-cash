import { PrismaClient } from '.prisma/transfer-client';

import { logger } from './logger';

export const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

// Log slow queries in development
prisma.$on('query', (e) => {
  if (e.duration > 100) {
    logger.warn({
      query: e.query,
      duration: e.duration,
    }, 'Slow query detected');
  }
});

prisma.$on('error', (e) => {
  logger.error({ message: e.message }, 'Prisma error');
});

prisma.$on('warn', (e) => {
  logger.warn({ message: e.message }, 'Prisma warning');
});
