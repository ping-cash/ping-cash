import { loadConfig } from '@ping/config';
import { Connection } from '@solana/web3.js';
import type { FastifyInstance } from 'fastify';

const config = loadConfig();

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/healthz', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  fastify.get('/readyz', async (_request, reply) => {
    if (!config.SOLANA_RPC_URL) {
      return reply.status(200).send({ status: 'ready', solana: 'stub-mode' });
    }
    try {
      const conn = new Connection(config.SOLANA_RPC_URL, 'confirmed');
      await conn.getSlot();
      return reply.status(200).send({ status: 'ready', solana: 'connected' });
    } catch (err) {
      return reply.status(503).send({
        status: 'not_ready',
        solana: 'disconnected',
        error: (err as Error).message,
      });
    }
  });
}
