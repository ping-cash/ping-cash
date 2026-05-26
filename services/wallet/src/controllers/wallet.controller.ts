import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { buildSendIntent } from '../services/send.service';
import {
  getBalanceSnapshot,
  isValidSolanaAddress,
} from '../services/solana.service';
import {
  buildStakeIntent,
  buildUnstakeIntent,
  getVaultPosition,
} from '../services/vault.service';
import { WalletErrors } from '../utils/errors';

const StakeIntentBody = z.object({
  amountUsdc: z.string().regex(/^\d+(\.\d{1,6})?$/),
});

const UnstakeIntentBody = z.object({
  amountUsdc: z.string().regex(/^\d+(\.\d{1,6})?$/),
});

const SendIntentBody = z.object({
  recipientWallet: z.string().min(32).max(44),
  amountUsdc: z.string().regex(/^\d+(\.\d{1,6})?$/),
});

async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ sub: string; wallet?: string }> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    void reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Bearer token required' },
    });
    throw WalletErrors.Unauthorized();
  }
  const token = authHeader.slice(7);
  const payload = (
    request.server as {
      jwt: { verify: (t: string) => { sub: string; wallet?: string } };
    }
  ).jwt.verify(token);
  return payload;
}

export async function walletRoutes(fastify: FastifyInstance) {
  // GET /wallet/balance — snapshot of USDC + vUSDC + $PING balances
  fastify.get(
    '/balance',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      const walletAddress =
        (request.query as { address?: string }).address ?? auth.wallet;
      if (!walletAddress) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No wallet address available',
          },
        });
      }
      const snapshot = await getBalanceSnapshot(walletAddress);
      return reply.status(200).send(snapshot);
    }
  );

  // GET /wallet/address — return the user's wallet address + QR data + deposit memo
  fastify.get(
    '/address',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth.wallet) {
        return reply.status(404).send({
          error: {
            code: 'WALLET_NOT_FOUND',
            message: 'No wallet bound to this account',
          },
        });
      }
      return reply.status(200).send({
        address: auth.wallet,
        chain: 'solana',
        acceptedTokens: [
          'USDC',
          'USDT',
          'FDUSD',
          'PHPC',
          'cKES',
          'cNGN',
          'EURC',
          'GBPT',
          '$PING',
        ],
        // Per ADR 0007: any SPL token received auto-swaps to USDC
        autoSwapPolicy: 'auto-swap to USDC via Jupiter, max 0.5% slippage',
      });
    }
  );

  // GET /wallet/vault — Earn Vault position info
  fastify.get(
    '/vault',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth.wallet) {
        return reply.status(404).send({
          error: { code: 'WALLET_NOT_FOUND', message: 'No wallet bound' },
        });
      }
      const position = await getVaultPosition(auth.wallet);
      return reply.status(200).send(position);
    }
  );

  // POST /wallet/vault/stake-intent — build unsigned stake() tx
  fastify.post(
    '/vault/stake-intent',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth.wallet) {
        return reply.status(404).send({
          error: { code: 'WALLET_NOT_FOUND', message: 'No wallet bound' },
        });
      }
      const body = StakeIntentBody.parse(request.body);
      const intent = await buildStakeIntent(auth.wallet, body.amountUsdc);
      return reply.status(200).send(intent);
    }
  );

  // POST /wallet/vault/unstake-intent — build unsigned unstake() tx
  fastify.post(
    '/vault/unstake-intent',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth.wallet) {
        return reply.status(404).send({
          error: { code: 'WALLET_NOT_FOUND', message: 'No wallet bound' },
        });
      }
      const body = UnstakeIntentBody.parse(request.body);
      const intent = await buildUnstakeIntent(auth.wallet, body.amountUsdc);
      return reply.status(200).send(intent);
    }
  );

  // POST /wallet/send-intent — build unsigned USDC SPL Token transfer
  // Pillar 4 send-side: client signs via Privy MPC and submits to Solana RPC.
  // Backend NEVER signs per ADR 0017 (custody model).
  fastify.post(
    '/send-intent',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth.wallet) {
        return reply.status(404).send({
          error: { code: 'WALLET_NOT_FOUND', message: 'No wallet bound' },
        });
      }
      const body = SendIntentBody.parse(request.body);
      const intent = await buildSendIntent(
        auth.wallet,
        body.recipientWallet,
        body.amountUsdc
      );
      return reply.status(200).send(intent);
    }
  );

  // GET /wallet/validate?address=... — utility for validating Solana addresses
  fastify.get(
    '/validate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { address } = request.query as { address?: string };
      if (!address) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'address query param required',
          },
        });
      }
      return reply
        .status(200)
        .send({ valid: isValidSolanaAddress(address), address });
    }
  );
}
