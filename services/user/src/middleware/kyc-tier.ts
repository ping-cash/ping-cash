import type { FastifyRequest, FastifyReply } from 'fastify';
import { KycClient } from '@ping/kyc-client';

import { getConfig } from '@ping/config';
import { logger } from '../utils/logger';

const config = getConfig();

let kycClient: KycClient | null = null;

function getClient(): KycClient | null {
  if (!process.env.KYC_SERVICE_URL) return null;
  if (!kycClient) {
    kycClient = new KycClient({
      baseUrl: process.env.KYC_SERVICE_URL,
      serviceToken: process.env.KYC_SERVICE_TOKEN,
    });
  }
  return kycClient;
}

export function requireKycTier(
  minTier: 1 | 2,
  options: { userIdFrom?: 'context' | 'body' } = { userIdFrom: 'context' }
) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    let userId: string | undefined;
    if (options.userIdFrom === 'body') {
      userId = (req.body as { userId?: string } | undefined)?.userId;
    } else {
      userId = (req as unknown as { userId?: string }).userId;
    }
    if (!userId) {
      reply.status(401).send({ error: { code: 'UNAUTHENTICATED' } });
      return;
    }

    const client = getClient();
    if (!client) {
      logger.warn(
        { userId, minTier },
        '[STUB] KYC_SERVICE_URL unset — allowing through'
      );
      return;
    }

    try {
      const state = await client.getState(userId);
      if (state.kycTier < minTier) {
        reply.status(403).send({
          error: {
            code: 'KYC_TIER_INSUFFICIENT',
            message: `This action requires KYC tier ${minTier}; current tier is ${state.kycTier}.`,
            details: { currentTier: state.kycTier, requiredTier: minTier },
          },
        });
        return;
      }
    } catch (err) {
      logger.error({ err, userId }, 'KYC lookup failed — denying for safety');
      reply.status(503).send({
        error: { code: 'KYC_SERVICE_UNAVAILABLE' },
      });
      return;
    }
  };
}

void config;
