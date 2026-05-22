import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { computeClawback, tierFromBalance } from '../services/clawback.service';

const ClawbackBody = z.object({
  userId: z.string().uuid(),
  saleAmount: z.number().positive(),
  currentBalance: z.number().nonnegative(),
  pingPriceAtSale: z.number().positive(),
  feeHistory: z.array(
    z.object({
      timestamp: z.number().int().positive(),
      feeAmountUsd: z.number().nonnegative(),
      tierUsedAtTime: z.enum(['bronze', 'silver', 'gold', 'platinum']),
      discountReceivedUsd: z.number().nonnegative(),
      pingBalanceAtTime: z.number().nonnegative(),
    }),
  ),
  balanceHistory: z.array(
    z.object({
      timestamp: z.number().int().positive(),
      balance: z.number().nonnegative(),
    }),
  ),
});

const TierBody = z.object({
  balance: z.number().nonnegative(),
});

export async function tokenRoutes(fastify: FastifyInstance) {
  // POST /token/clawback/compute — preview clawback for a proposed sale
  fastify.post(
    '/clawback/compute',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = ClawbackBody.parse(request.body);
      const result = computeClawback(
        {
          userId: body.userId,
          saleAmount: body.saleAmount,
          currentBalance: body.currentBalance,
          feeHistory: body.feeHistory,
          balanceHistory: body.balanceHistory,
        },
        body.pingPriceAtSale,
      );
      return reply.status(200).send(result);
    },
  );

  // POST /token/tier — compute tier from a balance number
  fastify.post('/tier', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = TierBody.parse(request.body);
    return reply.status(200).send({ balance: body.balance, tier: tierFromBalance(body.balance) });
  });
}
