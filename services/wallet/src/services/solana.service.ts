/**
 * Solana RPC client — reads on-chain state.
 *
 * Per ADR 0007 (Multi-token receive via Jupiter): the wallet-service indexes
 * USDC, vUSDC, $PING (Phase 2), and any other SPL token in user wallets.
 *
 * Per ADR 0017 (Custody model): we only READ on-chain state, never sign tx
 * on behalf of users. Signing is delegated to Privy MPC or external wallet.
 */
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { loadConfig } from '@ping/config';
import { logger } from '../utils/logger';
import { WalletErrors } from '../utils/errors';

const config = loadConfig();

// Solana RPC connection — Helius / QuickNode endpoint in production
let _connection: Connection | null = null;
function getConnection(): Connection {
  if (_connection) return _connection;
  const rpcUrl = config.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
  _connection = new Connection(rpcUrl, 'confirmed');
  return _connection;
}

// Token mints — set via env (sourced from OpenBao in production)
const MINTS = {
  USDC: new PublicKey(config.SOLANA_USDC_MINT ?? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  PING: config.PING_TOKEN_MINT ? new PublicKey(config.PING_TOKEN_MINT) : null, // Phase 2 only
  V_USDC: config.V_USDC_MINT ? new PublicKey(config.V_USDC_MINT) : null, // Phase 1+ once vault deployed
};

export interface BalanceSnapshot {
  walletAddress: string;
  USDC: string;     // human-readable decimal string
  vUSDC: string;    // 1:1 with USDC, represents staked-in-vault amount
  PING: string;     // Phase 2 only
  totalUsdValue: string;
}

/**
 * Read SPL token balance for a given wallet + mint.
 * Returns '0' if the associated token account doesn't exist.
 */
async function getTokenBalance(walletAddress: PublicKey, mint: PublicKey, decimals = 6): Promise<string> {
  try {
    const ata = await getAssociatedTokenAddress(mint, walletAddress, false, TOKEN_PROGRAM_ID);
    const account = await getAccount(getConnection(), ata, 'confirmed', TOKEN_PROGRAM_ID);
    return formatAmount(account.amount, decimals);
  } catch (err) {
    // Token account doesn't exist yet
    const errStr = (err as Error).message || '';
    if (errStr.includes('TokenAccountNotFoundError') || errStr.includes('could not find account')) {
      return '0';
    }
    // Try Token-2022 program for $PING
    try {
      const ata = await getAssociatedTokenAddress(mint, walletAddress, false, TOKEN_2022_PROGRAM_ID);
      const account = await getAccount(getConnection(), ata, 'confirmed', TOKEN_2022_PROGRAM_ID);
      return formatAmount(account.amount, decimals);
    } catch (_err2) {
      return '0';
    }
  }
}

function formatAmount(raw: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const fraction = raw % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fractionStr ? `${whole}.${fractionStr}` : `${whole}`;
}

/**
 * Get a full balance snapshot for a wallet.
 * Stub mode: returns zeros if RPC isn't configured.
 */
export async function getBalanceSnapshot(walletAddress: string): Promise<BalanceSnapshot> {
  if (!config.SOLANA_RPC_URL) {
    logger.warn({ walletAddress }, '[STUB MODE] No Solana RPC — returning empty balances');
    return {
      walletAddress,
      USDC: '0',
      vUSDC: '0',
      PING: '0',
      totalUsdValue: '0',
    };
  }

  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(walletAddress);
  } catch {
    throw WalletErrors.InvalidAddress();
  }

  try {
    const usdcBalance = await getTokenBalance(pubkey, MINTS.USDC, 6);
    const vUsdcBalance = MINTS.V_USDC
      ? await getTokenBalance(pubkey, MINTS.V_USDC, 6)
      : '0';
    const pingBalance = MINTS.PING
      ? await getTokenBalance(pubkey, MINTS.PING, 9)
      : '0';

    // Total USD value: USDC + vUSDC (both pegged to USD); PING NOT counted here
    // (it's a separate display element + tier indicator, not "money")
    const totalUsd = (parseFloat(usdcBalance) + parseFloat(vUsdcBalance)).toFixed(2);

    return {
      walletAddress,
      USDC: usdcBalance,
      vUSDC: vUsdcBalance,
      PING: pingBalance,
      totalUsdValue: totalUsd,
    };
  } catch (err) {
    logger.error({ err, walletAddress }, 'Failed to read Solana balances');
    throw WalletErrors.SolanaRpcError({ message: (err as Error).message });
  }
}

/**
 * Validate a Solana address format.
 * Used at API boundaries to reject malformed wallet addresses early.
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
