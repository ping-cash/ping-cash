import type { FastifyInstance } from 'fastify';
export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/healthz', async (_request, reply) =>
    reply.status(200).send({ status: 'ok' })
  );
  fastify.get('/readyz', async (_request, reply) =>
    reply.status(200).send({ status: 'ready' })
  );
}
