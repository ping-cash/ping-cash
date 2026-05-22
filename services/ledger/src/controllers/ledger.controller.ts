import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as ledgerService from '../services/ledger.service';

const EntrySchema = z.object({
  accountId: z.string().uuid(),
  accountType: z.enum([
    'user_wallet',
    'platform_fee',
    'platform_markup',
    'provider_cost',
    'yield_pool',
    'foundation_reserve',
  ]),
  entryType: z.enum(['DEBIT', 'CREDIT']),
  amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
  currency: z.string().min(3).max(8),
  description: z.string().max(500).optional(),
});

const CommitBody = z.object({
  transactionId: z.string().uuid(),
  transactionType: z.enum(['transfer', 'fee', 'yield', 'offramp', 'refund', 'welcome_grant']),
  entries: z.array(EntrySchema).min(2),
  metadata: z.record(z.unknown()).optional(),
  outboxEvent: z
    .object({
      topic: z.string().min(1),
      eventType: z.string().min(1),
      payload: z.record(z.unknown()),
      correlationId: z.string().optional(),
      causationId: z.string().optional(),
    })
    .optional(),
});

export async function ledgerRoutes(fastify: FastifyInstance) {
  // POST /ledger/commit — atomic write of N entries summing to zero
  fastify.post('/commit', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = CommitBody.parse(request.body);
    const result = await ledgerService.commit(body);
    return reply.status(201).send(result);
  });

  // GET /ledger/balance/:accountId
  fastify.get(
    '/balance/:accountId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { accountId } = request.params as { accountId: string };
      const { currency } = request.query as { currency?: string };
      const balance = await ledgerService.getBalance(accountId, currency);
      return reply.status(200).send({ accountId, currency: currency ?? 'USDC', balance });
    },
  );

  // GET /ledger/transactions/:accountId
  fastify.get(
    '/transactions/:accountId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { accountId } = request.params as { accountId: string };
      const { currency, limit, cursor } = request.query as {
        currency?: string;
        limit?: string;
        cursor?: string;
      };
      const result = await ledgerService.getTransactions(accountId, {
        currency,
        limit: limit ? Number(limit) : 50,
        cursor,
      });
      return reply.status(200).send(result);
    },
  );
}
