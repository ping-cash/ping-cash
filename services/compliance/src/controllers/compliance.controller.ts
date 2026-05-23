import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

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
}
