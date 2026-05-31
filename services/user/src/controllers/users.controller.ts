import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { requireKycTier } from '../middleware/kyc-tier';
import * as contactsService from '../services/contacts.service';
import * as userService from '../services/user.service';
import * as welcomeStakeService from '../services/welcome-stake.service';
import { UserErrors } from '../utils/errors';

const UpdateProfileBody = z.object({
  displayName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
  language: z.string().min(2).max(5).optional(),
  country: z.string().length(3).optional(),
});

const ContactSyncBody = z.object({
  contacts: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        phones: z
          .array(z.string().regex(/^\+[1-9]\d{6,14}$/))
          .min(1)
          .max(10),
      })
    )
    .max(2000),
});

const CreateOrFetchBody = z.object({
  privyUserId: z.string().min(1),
  walletAddress: z.string().min(20),
  phoneHash: z.string().length(64),
  phoneEncrypted: z.string().optional(),
  country: z.string().length(3).optional(),
});

const GrantWelcomeStakeBody = z.object({
  userId: z.string().uuid(),
  transferId: z.string().min(1),
});

/**
 * JWT auth hook — extracts user ID from Bearer token.
 */
async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<string> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    void reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Bearer token required' },
    });
    throw UserErrors.Unauthorized();
  }
  const token = authHeader.slice(7);
  // verify() returns { sub, ... } — sub is the user ID
  const payload = (
    request.server as { jwt: { verify: (t: string) => { sub: string } } }
  ).jwt.verify(token);
  return payload.sub;
}

export async function userRoutes(fastify: FastifyInstance) {
  // ────────────────────────────────────────────────────────────────────
  // Internal service endpoints (auth-service calls these)
  // ────────────────────────────────────────────────────────────────────

  // POST /users/internal/create-or-fetch — called by auth-service after Privy bind
  fastify.post(
    '/internal/create-or-fetch',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = CreateOrFetchBody.parse(request.body);
      const result = await userService.createOrFetch(body);
      return reply.status(result.isNewUser ? 201 : 200).send(result);
    }
  );

  // POST /users/internal/welcome-stake — called by transfer-service on first outbound ≥ $10
  // Tier 1 KYC required (welcome-stake is real-money-adjacent — Persona phone+selfie minimum)
  fastify.post(
    '/internal/welcome-stake',
    { preHandler: [requireKycTier(1, { userIdFrom: 'body' })] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = GrantWelcomeStakeBody.parse(request.body);
      await welcomeStakeService.grant(body.userId, body.transferId);
      return reply.status(204).send();
    }
  );

  // GET /users/internal/by-phone-hash/:hash — called by transfer-service to link
  // a transfer to an existing user when the recipient is already registered.
  // Returns {userId, walletAddress} or 404. walletAddress added 2026-05-31
  // for #52 in-network $PING send — wallet-service callers need the recipient's
  // wallet to build the SPL transfer intent without a second round-trip.
  fastify.get(
    '/internal/by-phone-hash/:hash',
    async (
      request: FastifyRequest<{ Params: { hash: string } }>,
      reply: FastifyReply
    ) => {
      const { hash } = request.params;
      if (!/^[0-9a-f]{64}$/.test(hash)) {
        return reply
          .status(400)
          .send({ error: { code: 'INVALID_PHONE_HASH' } });
      }
      const user = await userService.getByPhoneHash(hash);
      if (!user) {
        return reply.status(404).send({ error: { code: 'USER_NOT_FOUND' } });
      }
      return reply.status(200).send({
        userId: user.id,
        walletAddress: user.walletAddress,
      });
    }
  );

  // ────────────────────────────────────────────────────────────────────
  // User-facing endpoints (require JWT)
  // ────────────────────────────────────────────────────────────────────

  // GET /users/me — return current user profile + tier + Ping Points
  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await requireAuth(request, reply);
    const user = await userService.getById(userId);
    return reply.status(200).send(user);
  });

  // PATCH /users/me — update profile fields
  fastify.patch('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await requireAuth(request, reply);
    const body = UpdateProfileBody.parse(request.body);
    const user = await userService.updateProfile(userId, body);
    return reply.status(200).send(user);
  });

  // GET /users/me/contacts — list contacts with filters
  fastify.get(
    '/me/contacts',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = await requireAuth(request, reply);
      const { q, registered, limit, cursor } = request.query as {
        q?: string;
        registered?: string;
        limit?: string;
        cursor?: string;
      };
      const result = await contactsService.list(userId, {
        search: q,
        registered:
          registered === 'true'
            ? true
            : registered === 'false'
              ? false
              : undefined,
        limit: limit ? Number(limit) : 50,
        cursor,
      });
      return reply.status(200).send(result);
    }
  );

  // POST /users/me/contacts/sync — bulk-sync phone contacts
  fastify.post(
    '/me/contacts/sync',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = await requireAuth(request, reply);
      const body = ContactSyncBody.parse(request.body);
      const result = await contactsService.sync(userId, body.contacts);
      return reply.status(200).send(result);
    }
  );
}
