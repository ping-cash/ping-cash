import type { FastifyInstance } from 'fastify';

import { redis } from '../utils/redis';

export async function healthRoutes(fastify: FastifyInstance) {
  // K8s liveness — always 200 if process is running
  fastify.get('/healthz', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  // K8s readiness — checks dependencies (Redis)
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

  // Legacy / alternate
  fastify.get('/health/live', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  fastify.get('/health/ready', async (_request, reply) => {
    try {
      await redis.ping();
      return reply.status(200).send({ status: 'ready' });
    } catch {
      return reply.status(503).send({ status: 'not_ready' });
    }
  });
}
