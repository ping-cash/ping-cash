/**
 * Earn Vault interaction layer.
 *
 * Per ADR 0012 (Earn Vault):
 *   - This service does NOT custody funds
 *   - It constructs unsigned transaction instructions; the user signs via
 *     Privy MPC or their external wallet
 *   - For Phase 1, the Earn Vault contract isn't deployed yet — these
 *     methods return stub instructions that wallet-service can serialize
 *
 * Per ADR 0017 (Custody model): wallet-service NEVER signs on behalf of users.
 */
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';

import { WalletErrors } from '../utils/errors';
import { logger } from '../utils/logger';

export interface VaultStakeIntent {
  userWallet: string;
  amountUsdc: string;
  serializedTransaction: string; // base64-encoded unsigned tx
  expiresInSeconds: number;
}

export interface VaultUnstakeIntent extends VaultStakeIntent {}

/**
 * Build an unsigned stake() transaction for a user.
 *
 * Phase 1 stub: returns a placeholder. Phase 2 will construct the actual
 * Anchor instruction for the EarnVault program.
 */
export async function buildStakeIntent(
  userWallet: string,
  amountUsdc: string,
): Promise<VaultStakeIntent> {
  logger.info(
    { userWallet, amountUsdc },
    '[STUB] Building Earn Vault stake intent (vault not yet deployed)',
  );

  try {
    new PublicKey(userWallet);
  } catch {
    throw WalletErrors.InvalidAddress();
  }

  // Phase 1: return an empty transaction as placeholder
  // Phase 2: construct actual Anchor instruction once Earn Vault is live
  const tx = new Transaction();
  const dummyInstruction = new TransactionInstruction({
    keys: [{ pubkey: new PublicKey(userWallet), isSigner: true, isWritable: true }],
    programId: new PublicKey('11111111111111111111111111111111'), // SystemProgram (placeholder)
    data: Buffer.from([]),
  });
  tx.add(dummyInstruction);

  return {
    userWallet,
    amountUsdc,
    serializedTransaction: tx.serializeMessage().toString('base64'),
    expiresInSeconds: 60,
  };
}

/**
 * Build an unsigned unstake() transaction for a user.
 *
 * Used in the atomic unstake+send flow:
 *   - transfer-service computes the unstake amount needed
 *   - wallet-service builds the instruction
 *   - client wallet signs + submits in a SINGLE transaction (with the transfer)
 */
export async function buildUnstakeIntent(
  userWallet: string,
  amountUsdc: string,
): Promise<VaultUnstakeIntent> {
  logger.info(
    { userWallet, amountUsdc },
    '[STUB] Building Earn Vault unstake intent (vault not yet deployed)',
  );

  try {
    new PublicKey(userWallet);
  } catch {
    throw WalletErrors.InvalidAddress();
  }

  const tx = new Transaction();
  const dummyInstruction = new TransactionInstruction({
    keys: [{ pubkey: new PublicKey(userWallet), isSigner: true, isWritable: true }],
    programId: new PublicKey('11111111111111111111111111111111'),
    data: Buffer.from([]),
  });
  tx.add(dummyInstruction);

  return {
    userWallet,
    amountUsdc,
    serializedTransaction: tx.serializeMessage().toString('base64'),
    expiresInSeconds: 60,
  };
}

/**
 * Read vault deposit info for a user.
 *
 * Phase 1 stub: returns 0 deposited / 0 yield earned.
 * Phase 2: queries vault program PDA for actual values.
 */
export interface VaultPosition {
  walletAddress: string;
  vUsdcBalance: string;
  earnedPingLifetime: string;
  apyDisplay: string;
}

export async function getVaultPosition(walletAddress: string): Promise<VaultPosition> {
  try {
    new PublicKey(walletAddress);
  } catch {
    throw WalletErrors.InvalidAddress();
  }

  logger.info({ walletAddress }, '[STUB] Reading Earn Vault position (Phase 1)');

  return {
    walletAddress,
    vUsdcBalance: '0',
    earnedPingLifetime: '0',
    apyDisplay: '3.0', // Display rate; real rate computed daily by vault contract in Phase 2
  };
}
