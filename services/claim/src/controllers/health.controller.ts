import type { FastifyInstance } from 'fastify';

import { redis } from '../utils/redis';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/healthz', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });
  fastify.get('/readyz', async (_request, reply) => {
    try {
      await redis.ping();
      return reply.status(200).send({ status: 'ready', redis: 'connected' });
    } catch (err) {
      return reply.status(503).send({
        status: 'not_ready',
        redis: 'disconnected',
        error: (err as Error).message,
      });
    }
  });
}
