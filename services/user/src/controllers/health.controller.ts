import type { FastifyInstance } from 'fastify';

import { prisma } from '../utils/prisma';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/healthz', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  fastify.get('/readyz', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.status(200).send({ status: 'ready', postgres: 'connected' });
    } catch (err) {
      return reply.status(503).send({
        status: 'not_ready',
        postgres: 'disconnected',
        error: (err as Error).message,
      });
    }
  });

  fastify.get('/health/live', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  fastify.get('/health/ready', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.status(200).send({ status: 'ready' });
    } catch {
      return reply.status(503).send({ status: 'not_ready' });
    }
  });
}
