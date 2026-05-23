import { logger } from './logger';

// eslint-disable-next-line import/order
import { PrismaClient } from '.prisma/ledger-client';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error' as never, (e: unknown) =>
  logger.error({ err: e }, 'Prisma error')
);
prisma.$on('warn' as never, (e: unknown) =>
  logger.warn({ msg: e }, 'Prisma warning')
);
