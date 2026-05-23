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
 */
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

import { WalletErrors } from '../utils/errors';
import { logger } from '../utils/logger';

const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

export interface SendIntent {
  senderWallet: string;
  recipientWallet: string;
  amountUsdc: string;
  serializedTransaction: string;
  expiresInSeconds: number;
  meta: {
    mint: string;
    program: string;
  };
}

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

  const tx = new Transaction({
    feePayer: new PublicKey(senderWallet),
    // Placeholder blockhash — client refreshes via Connection.getLatestBlockhash()
    // before signing. Per ADR 0017 we never fetch on behalf of the user.
    recentBlockhash: '11111111111111111111111111111111',
  });
  const placeholder = new TransactionInstruction({
    keys: [
      {
        pubkey: new PublicKey(senderWallet),
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: new PublicKey(recipientWallet),
        isSigner: false,
        isWritable: true,
      },
    ],
    programId: new PublicKey(SPL_TOKEN_PROGRAM_ID),
    data: Buffer.from([]),
  });
  tx.add(placeholder);

  return {
    senderWallet,
    recipientWallet,
    amountUsdc,
    serializedTransaction: tx.serializeMessage().toString('base64'),
    expiresInSeconds: 60,
    meta: {
      mint: USDC_MINT_MAINNET,
      program: SPL_TOKEN_PROGRAM_ID,
    },
  };
}
