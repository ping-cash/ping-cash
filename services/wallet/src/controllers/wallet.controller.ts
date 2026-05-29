import { loadConfig } from '@ping/config';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';


import { buildSendIntent } from '../services/send.service';
import {
  getBalanceSnapshot,
  isValidSolanaAddress,
} from '../services/solana.service';
import {
  fundNewWallet,
  getTreasuryAddress,
} from '../services/treasury.service';
import {
  buildStakeIntent,
  buildUnstakeIntent,
  getVaultPosition,
} from '../services/vault.service';
import { WalletErrors } from '../utils/errors';

const config = loadConfig();

const FundNewWalletBody = z.object({
  recipientAddress: z.string().min(32).max(44),
});

function requireInternalSecret(
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  const expected = config.INTERNAL_SERVICE_SECRET;
  if (!expected) {
    void reply.status(503).send({
      error: {
        code: 'INTERNAL_AUTH_NOT_CONFIGURED',
        message: 'INTERNAL_SERVICE_SECRET not set on wallet-service',
      },
    });
    return false;
  }
  const header = request.headers['x-internal-secret'];
  if (header !== expected) {
    void reply.status(401).send({
      error: { code: 'UNAUTHORIZED', message: 'Invalid internal secret' },
    });
    return false;
  }
  return true;
}

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

  // POST /wallet/internal/fund-new-wallet — server-to-server.
  // Auth-service fires this when a fresh wallet is bound during signup.
  // Guarded by x-internal-secret header (shared INTERNAL_SERVICE_SECRET).
  fastify.post(
    '/internal/fund-new-wallet',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireInternalSecret(request, reply)) return;
      const parsed = FundNewWalletBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
        });
      }
      const result = await fundNewWallet(parsed.data.recipientAddress);
      return reply.status(200).send(result);
    }
  );

  // GET /wallet/internal/treasury — diagnostics: pubkey + whether enabled.
  fastify.get(
    '/internal/treasury',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireInternalSecret(request, reply)) return;
      return reply.status(200).send({
        enabled: config.TREASURY_FUND_ENABLED,
        amountUsdc: config.TREASURY_FUND_USDC_AMOUNT,
        treasuryAddress: getTreasuryAddress(),
      });
    }
  );
}
