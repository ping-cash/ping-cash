/**
 * Treasury auto-fund — devnet bootstrap.
 *
 * On signup the auth-service binds a fresh Privy wallet to the user's phone.
 * That wallet starts empty, so the home dashboard shows $0 and the user has
 * no way to send. This service seeds a small USDC balance from a treasury
 * keypair so a brand-new user can immediately complete a Send transfer
 * during the demo walk.
 *
 * Disabled by default. Enabled only when TREASURY_FUND_ENABLED=true AND
 * a TREASURY_PRIVATE_KEY_BASE64 is provided. Production turns this OFF.
 *
 * Keypair format: 64-byte ed25519 secret key, base64-encoded.
 * Generate with:
 *   node -e "const k=require('@solana/web3.js').Keypair.generate(); \
 *     console.log(Buffer.from(k.secretKey).toString('base64')); \
 *     console.log('pubkey:', k.publicKey.toBase58());"
 */
import { loadConfig } from '@ping/config';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

import { logger } from '../utils/logger';

const USDC_DECIMALS = 6;

let _treasury: Keypair | null = null;

function getTreasuryKeypair(): Keypair | null {
  if (_treasury) return _treasury;
  const config = loadConfig();
  const secret = config.TREASURY_PRIVATE_KEY_BASE64;
  if (!secret) return null;
  try {
    const bytes = Buffer.from(secret, 'base64');
    if (bytes.length !== 64) {
      logger.error(
        { actualLength: bytes.length },
        'TREASURY_PRIVATE_KEY_BASE64 invalid — expected 64 bytes'
      );
      return null;
    }
    _treasury = Keypair.fromSecretKey(bytes);
    return _treasury;
  } catch (err) {
    logger.error(
      { err: (err as Error).message },
      'Failed to decode TREASURY_PRIVATE_KEY_BASE64'
    );
    return null;
  }
}

export interface FundResult {
  funded: boolean;
  txSignature?: string;
  reason?: string;
}

/**
 * Send `TREASURY_FUND_USDC_AMOUNT` USDC from the treasury wallet to the
 * recipient. Idempotent ATA creation handles brand-new wallets.
 * Returns { funded: false, reason } when disabled or skipped.
 */
export async function fundNewWallet(
  recipientAddress: string
): Promise<FundResult> {
  const config = loadConfig();

  if (!config.TREASURY_FUND_ENABLED) {
    return { funded: false, reason: 'treasury-fund-disabled' };
  }
  if (!config.SOLANA_RPC_URL) {
    return { funded: false, reason: 'no-rpc-url' };
  }

  const treasury = getTreasuryKeypair();
  if (!treasury) {
    return { funded: false, reason: 'no-treasury-key' };
  }

  let recipient: PublicKey;
  try {
    recipient = new PublicKey(recipientAddress);
  } catch {
    return { funded: false, reason: 'invalid-recipient' };
  }

  const mint = new PublicKey(config.SOLANA_USDC_MINT);
  const treasuryAta = getAssociatedTokenAddressSync(mint, treasury.publicKey);
  const recipientAta = getAssociatedTokenAddressSync(mint, recipient);
  const amountAtomic = BigInt(
    Math.round(Number(config.TREASURY_FUND_USDC_AMOUNT) * 10 ** USDC_DECIMALS)
  );

  const connection = new Connection(config.SOLANA_RPC_URL, 'confirmed');

  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      treasury.publicKey,
      recipientAta,
      recipient,
      mint
    ),
    createTransferCheckedInstruction(
      treasuryAta,
      mint,
      recipientAta,
      treasury.publicKey,
      amountAtomic,
      USDC_DECIMALS
    )
  );

  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [treasury], {
      commitment: 'confirmed',
      skipPreflight: false,
    });
    logger.info(
      {
        recipient: recipientAddress,
        amount: config.TREASURY_FUND_USDC_AMOUNT,
        txSignature: sig,
      },
      'Treasury funded new wallet'
    );
    return { funded: true, txSignature: sig };
  } catch (err) {
    logger.error(
      { err: (err as Error).message, recipient: recipientAddress },
      'Treasury fund tx failed'
    );
    return { funded: false, reason: (err as Error).message };
  }
}

/**
 * For health/diagnostics — returns the treasury pubkey if configured.
 */
export function getTreasuryAddress(): string | null {
  const k = getTreasuryKeypair();
  return k ? k.publicKey.toBase58() : null;
}
