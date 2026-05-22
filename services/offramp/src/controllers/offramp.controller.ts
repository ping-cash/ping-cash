import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { executePayout, getAdapter } from '../services/router.service';
import { OfframpErrors } from '../utils/errors';
import type { ProviderName } from '../adapters/types';

const PayoutBody = z.object({
  reference: z.string().min(1),
  method: z.string().min(1),
  amount: z.object({
    usdcAmount: z.string().regex(/^\d+(\.\d{1,8})?$/),
    localAmount: z.string().regex(/^\d+(\.\d{1,8})?$/),
    localCurrency: z.string().min(3).max(8),
  }),
  recipient: z.object({
    phone: z.string().optional(),
    name: z.string().optional(),
    accountNumber: z.string().optional(),
    accountName: z.string().optional(),
    bankCode: z.string().optional(),
    extra: z.record(z.string()).optional(),
  }),
});

export async function offrampRoutes(fastify: FastifyInstance) {
  // POST /offramp/payout — execute payout with failover
  fastify.post('/payout', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = PayoutBody.parse(request.body);
    const result = await executePayout(body as never);
    return reply.status(202).send(result);
  });

  // POST /offramp/webhook/:provider — inbound webhook from a provider
  fastify.post(
    '/webhook/:provider',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { provider } = request.params as { provider: string };
      const adapter = getAdapter(provider as ProviderName);
      if (!adapter) {
        return reply.status(404).send({
          error: { code: 'PROVIDER_NOT_FOUND', message: `Unknown provider ${provider}` },
        });
      }
      const signature = request.headers['x-webhook-signature'] as string | undefined;
      const rawBody = JSON.stringify(request.body);
      if (!signature || !adapter.verifyWebhook(rawBody, signature)) {
        throw OfframpErrors.InvalidWebhookSignature();
      }
      const parsed = adapter.parseWebhook(rawBody);
      request.log.info({ provider, ...parsed }, 'Webhook received');

      // TODO: in production, emit Kafka event so transfer-service can mark transfer completed
      // For now, log + 200
      return reply.status(200).send({ received: true, ...parsed });
    },
  );
}
