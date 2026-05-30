/**
 * SPL Token transfer intent builder (USDC default; $PING via tokenMint param).
 *
 * Per ADR 0017 (Custody model): wallet-service NEVER signs on behalf of users.
 * The mobile client signs the returned unsigned tx via Privy MPC and submits
 * to Solana RPC.
 *
 * Token catalog: USDC (6 decimals) is the default. $PING (PING_TOKEN_MINT,
 * 9 decimals per Token-2022) ships per ADR 0009 + #70 devnet deploy. Any
 * other SPL Token mint can be transferred by passing tokenMint + decimals
 * explicitly — the on-chain instruction shape is identical.
 *
 * Per DoD step 7 (founder 2026-05-30): User 2 sends half of their $PING
 * back to User 1 — same code path, different mint.
 */
import { loadConfig } from '@ping/config';
import type { SendIntent } from '@ping/types';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { PublicKey, Transaction } from '@solana/web3.js';

import { WalletErrors } from '../utils/errors';
import { logger } from '../utils/logger';

const USDC_DECIMALS = 6;
const PING_DECIMALS = 9; // Token-2022 mint per ADR 0009 + #70 devnet keys

export type { SendIntent };

export type TokenKind = 'USDC' | 'PING';

export interface BuildSendIntentArgs {
  senderWallet: string;
  recipientWallet: string;
  /** Token amount in the token's native decimal representation (e.g. "1.500000") */
  amount: string;
  /** Token kind. Defaults to USDC for back-compat. */
  tokenKind?: TokenKind;
}

/**
 * Resolve the SPL Token mint + decimals for a given token kind.
 * - USDC: config.SOLANA_USDC_MINT (env-driven, devnet vs mainnet)
 * - PING: config.PING_TOKEN_MINT (env-driven, defaults to devnet mint)
 */
function resolveToken(
  kind: TokenKind,
  config: ReturnType<typeof loadConfig>
): { mint: string; decimals: number } {
  if (kind === 'PING') {
    if (!config.PING_TOKEN_MINT) {
      throw new Error('PING_TOKEN_MINT not configured');
    }
    return { mint: config.PING_TOKEN_MINT, decimals: PING_DECIMALS };
  }
  return { mint: config.SOLANA_USDC_MINT, decimals: USDC_DECIMALS };
}

export async function buildSendIntent(
  senderWallet: string,
  recipientWallet: string,
  amount: string,
  tokenKind: TokenKind = 'USDC'
): Promise<SendIntent> {
  try {
    new PublicKey(senderWallet);
  } catch {
    throw WalletErrors.InvalidAddress();
  }
  try {
    new PublicKey(recipientWallet);
  } catch {
    throw WalletErrors.InvalidAddress();
  }

  const config = loadConfig();
  const { mint: mintStr, decimals } = resolveToken(tokenKind, config);

  logger.info(
    { senderWallet, recipientWallet, amount, tokenKind, mint: mintStr },
    'Building SPL Token send intent (Phase 1 — client signs via Privy MPC)'
  );

  const sender = new PublicKey(senderWallet);
  const recipient = new PublicKey(recipientWallet);
  const mint = new PublicKey(mintStr);
  const senderAta = getAssociatedTokenAddressSync(mint, sender);
  const recipientAta = getAssociatedTokenAddressSync(mint, recipient);
  const amountAtomic = BigInt(Math.round(Number(amount) * 10 ** decimals));

  const tx = new Transaction({
    feePayer: sender,
    // Placeholder blockhash — client refreshes via Connection.getLatestBlockhash()
    // before signing. Per ADR 0017 we never fetch on behalf of the user.
    recentBlockhash: '11111111111111111111111111111111',
  });
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      sender,
      recipientAta,
      recipient,
      mint
    ),
    createTransferCheckedInstruction(
      senderAta,
      mint,
      recipientAta,
      sender,
      amountAtomic,
      decimals
    )
  );

  return {
    senderWallet,
    recipientWallet,
    amountUsdc: amount, // legacy field name; carries the amount regardless of token
    serializedTransaction: tx.serializeMessage().toString('base64'),
    expiresInSeconds: 60,
    meta: {
      mint: mintStr,
      tokenKind,
      program: TOKEN_PROGRAM_ID.toBase58(),
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),
      senderAta: senderAta.toBase58(),
      recipientAta: recipientAta.toBase58(),
      decimals,
      amountAtomic: amountAtomic.toString(),
    },
  };
}
