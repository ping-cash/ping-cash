import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as milestoneService from '../services/milestone.service';

const TransferEventBody = z.object({
  userId: z.string().uuid(),
  transferId: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
  timestamp: z.number().int().positive(),
});

const ReferralEventBody = z.object({
  referrerId: z.string().uuid(),
  refereeId: z.string().uuid(),
  refereeTransferCount: z.number().int().min(0),
});

export async function gamificationRoutes(fastify: FastifyInstance) {
  // GET /gamification/users/:userId/progress — list milestone progress
  fastify.get(
    '/users/:userId/progress',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };
      const progress = await milestoneService.getProgress(userId);
      return reply.status(200).send({
        userId,
        milestones: progress,
        definitions: milestoneService.getMilestoneDefinitions(),
      });
    },
  );

  // POST /gamification/events/transfer — consume transfer-completed event
  fastify.post(
    '/events/transfer',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = TransferEventBody.parse(request.body);
      const result = await milestoneService.onTransferCompleted(body);
      return reply.status(200).send(result);
    },
  );

  // POST /gamification/events/referral — consume referral activity event
  fastify.post(
    '/events/referral',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = ReferralEventBody.parse(request.body);
      const result = await milestoneService.onReferralActivity(body);
      return reply.status(200).send(result);
    },
  );

  // POST /gamification/cron/daily — operator-triggered daily check
  fastify.post(
    '/cron/daily',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const result = await milestoneService.dailyCronCheck();
      return reply.status(200).send(result);
    },
  );
}
