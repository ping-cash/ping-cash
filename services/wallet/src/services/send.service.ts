/**
 * USDC send (SPL Token transfer) intent builder.
 *
 * Per ADR 0017 (Custody model): wallet-service NEVER signs on behalf of users.
 * The mobile client signs the returned unsigned tx via Privy MPC and submits
 * to Solana RPC.
 *
 * Pillar 4 send-side: this is the missing wire between transfer-service
 * (which records the transfer + claim code) and the on-chain USDC move
 * (which the sender's client signs and submits).
 *
 * The tx is a real SPL Token transferChecked: sender's USDC associated-token-account
 * → recipient's USDC associated-token-account, debited by the requested amount
 * (6 decimals for USDC mainnet mint). Recipient ATA is included as a CreateAtaIfNeeded
 * idempotent instruction so brand-new wallets can receive on first send.
 */
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

const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDC_DECIMALS = 6;

export type { SendIntent };

export async function buildSendIntent(
  senderWallet: string,
  recipientWallet: string,
  amountUsdc: string
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

  logger.info(
    { senderWallet, recipientWallet, amountUsdc },
    'Building USDC send intent (Phase 1 — client signs via Privy MPC)'
  );

  const sender = new PublicKey(senderWallet);
  const recipient = new PublicKey(recipientWallet);
  const mint = new PublicKey(USDC_MINT_MAINNET);
  const senderAta = getAssociatedTokenAddressSync(mint, sender);
  const recipientAta = getAssociatedTokenAddressSync(mint, recipient);
  const amountAtomic = BigInt(
    Math.round(Number(amountUsdc) * 10 ** USDC_DECIMALS)
  );

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
      USDC_DECIMALS
    )
  );

  return {
    senderWallet,
    recipientWallet,
    amountUsdc,
    serializedTransaction: tx.serializeMessage().toString('base64'),
    expiresInSeconds: 60,
    meta: {
      mint: USDC_MINT_MAINNET,
      program: TOKEN_PROGRAM_ID.toBase58(),
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),
      senderAta: senderAta.toBase58(),
      recipientAta: recipientAta.toBase58(),
      decimals: USDC_DECIMALS,
      amountAtomic: amountAtomic.toString(),
    },
  };
}
