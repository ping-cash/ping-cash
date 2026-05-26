import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { buildVaultStateReader } from '../services/vault.service';

const UserIdParam = z.object({
  userId: z.string().min(1),
});

export async function vaultRoutes(fastify: FastifyInstance) {
  const reader = buildVaultStateReader();

  /**
   * GET /users/:userId/vault — unified balance for end-user dashboard.
   *
   * Per ADR 0012: response shape is what the mobile UI binds to directly.
   * The vUSDC share complexity stays inside the service; the client
   * receives `{ totalUsdc, accruedYieldUsdc, currentApyDecimal }`.
   */
  fastify.get(
    '/users/:userId/vault',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = UserIdParam.parse(request.params);
      const balance = await reader.readUserVault(userId);
      return reply.status(200).send(balance);
    }
  );
}
