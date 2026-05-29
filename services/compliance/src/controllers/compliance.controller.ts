import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import {
  getOfacFeedMeta,
  refreshOfacSdnFeed,
  screenAddressAgainstSdn,
} from '../services/ofac-screener.service';
import {
  screenWallet,
  screenName,
  checkTransferAllowance,
} from '../services/sanctions.service';

const ScreenWalletBody = z.object({
  walletAddress: z.string().min(20),
  chain: z.enum(['solana', 'ethereum', 'tron', 'base']),
});

const ScreenNameBody = z.object({
  fullName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
});

const AllowanceBody = z.object({
  senderWallet: z.string().min(20),
  recipientWallet: z.string().min(20).optional(),
  senderName: z.string().optional(),
  recipientName: z.string().optional(),
  amountUsdc: z.string().regex(/^\d+(\.\d{1,8})?$/),
});

export async function complianceRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/sanctions/screen/wallet',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = ScreenWalletBody.parse(request.body);
      const result = await screenWallet(body);
      return reply.status(200).send(result);
    }
  );

  fastify.post(
    '/sanctions/screen/name',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = ScreenNameBody.parse(request.body);
      const result = await screenName(body);
      return reply.status(200).send(result);
    }
  );

  fastify.post(
    '/transfers/check-allowance',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = AllowanceBody.parse(request.body);
      const result = await checkTransferAllowance(body);
      return reply.status(200).send(result);
    }
  );

  // GET /screen/:address — self-built OFAC SDN screener (#75 / Path B
  // for #68). Returns { matched, listingDate, programs, source,
  // checkedAt }. Backed by the Redis sorted set the OFAC refresh loop
  // populates from treasury.gov SDN XML every 4h. transfer-service +
  // claim-service call this before any USDC movement.
  fastify.get(
    '/screen/:address',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { address } = request.params as { address?: string };
      if (!address || address.length < 4) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'address path required' },
        });
      }
      const result = await screenAddressAgainstSdn(address);
      return reply.status(200).send(result);
    }
  );

  // GET /ofac/meta — diagnostics: refreshedAt + count surfaces whether
  // the SDN feed has actually loaded into the local Redis sorted set.
  // Operators curl this to confirm the cron is working.
  fastify.get(
    '/ofac/meta',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const meta = await getOfacFeedMeta();
      return reply.status(200).send(meta);
    }
  );

  // POST /ofac/refresh — manual one-shot refresh of the SDN feed
  // outside the 4h cron cadence. Useful when an operator needs to
  // pick up a same-day SDN update without waiting for the timer.
  fastify.post(
    '/ofac/refresh',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const result = await refreshOfacSdnFeed();
      return reply.status(200).send(result);
    }
  );
}
