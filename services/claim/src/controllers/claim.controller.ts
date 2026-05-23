import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as claimService from '../services/claim.service';

const CreateClaimBody = z.object({
  transferId: z.string().min(1),
  senderId: z.string().uuid(),
  senderName: z.string().min(1).max(100).optional(),
  recipientPhone: z.string().regex(/^\+[1-9]\d{6,14}$/),
  amount: z.object({
    value: z.string().regex(/^\d+(\.\d{1,8})?$/),
    currency: z.string().min(3).max(8),
    localValue: z
      .string()
      .regex(/^\d+(\.\d{1,8})?$/)
      .optional(),
    localCurrency: z.string().min(3).max(8).optional(),
    fxRate: z.number().optional(),
  }),
});

const VerifyOtpBody = z.object({
  code: z.string().regex(/^\d{6}$/),
});

const CashoutBody = z.object({
  method: z.string().min(1),
  account: z.string().min(1),
  accountName: z.string().min(1).max(100).optional(),
});

export async function claimRoutes(fastify: FastifyInstance) {
  // POST /claims/internal/create — called by transfer-service
  fastify.post(
    '/internal/create',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = CreateClaimBody.parse(request.body);
      const result = await claimService.create(body);
      return reply.status(201).send(result);
    }
  );

  // GET /claims/:code — public claim landing data
  fastify.get(
    '/:code',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { code } = request.params as { code: string };
      const result = await claimService.getPublic(code, request.ip);
      return reply.status(200).send(result);
    }
  );

  // POST /claims/:code/otp — request OTP delivery to the recipient phone
  fastify.post(
    '/:code/otp',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { code } = request.params as { code: string };
      const result = await claimService.requestOtp(code, request.ip);
      return reply.status(200).send(result);
    }
  );

  // POST /claims/:code/verify — submit OTP, get verification token + cashout options
  fastify.post(
    '/:code/verify',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { code } = request.params as { code: string };
      const body = VerifyOtpBody.parse(request.body);
      const result = await claimService.verifyOtp(code, body.code);
      return reply.status(200).send(result);
    }
  );

  // POST /claims/:code/cashout — execute the selected cash-out method
  fastify.post(
    '/:code/cashout',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { code } = request.params as { code: string };
      const body = CashoutBody.parse(request.body);
      const result = await claimService.executeCashout({
        code,
        ...body,
      });
      return reply.status(200).send(result);
    }
  );
}
