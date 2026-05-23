import { logger } from './logger';

// eslint-disable-next-line import/order
import { PrismaClient } from '.prisma/user-client';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error', e => logger.error({ err: e }, 'Prisma error'));
prisma.$on('warn', e => logger.warn({ msg: e }, 'Prisma warning'));
