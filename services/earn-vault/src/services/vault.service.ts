/**
 * Vault state reader for the on-chain earn-vault program (#15 / #61).
 *
 * Per ADR 0012: end-users see a UNIFIED balance (idle USDC + staked vUSDC
 * + accrued yield). We hide the vUSDC token from them entirely.
 *
 * Stub-aware: when EARN_VAULT_PROGRAM_ID + V_USDC_MINT are unset, returns
 * synthetic empty state. When set, performs RPC reads against the program's
 * UserVault PDA + the global Vault PDA.
 *
 * Non-goals (covered by #15 + #61):
 *   - stake / unstake instruction building (delegated to wallet-service which
 *     owns Privy MPC signing)
 *   - HarvestEvent subscription (Phase 2; #15 must ship events first)
 */
import { loadConfig } from '@ping/config';

import { logger } from '../utils/logger';

const config = loadConfig();

export interface UnifiedBalance {
  /** Total USDC the user controls — idle + staked + accrued (UI displays this) */
  totalUsdc: string;
  /** Liquid USDC held in user wallet (not staked) */
  idleUsdc: string;
  /** USDC staked into the vault — internal accounting, not user-visible */
  stakedUsdc: string;
  /** Accrued yield since last harvest tick, expressed in USDC */
  accruedYieldUsdc: string;
  /** Current vault APY (decimal — 0.085 = 8.5% APY), or null if vault not deployed */
  currentApyDecimal: number | null;
  /** True when vault program is not yet deployed; the service is in stub mode */
  stubMode: boolean;
  /** Last on-chain refresh tick (unix-seconds) */
  refreshedAt: number;
}

export interface VaultStateReader {
  readUserVault(userId: string): Promise<UnifiedBalance>;
}

const STUB_BALANCE: Omit<UnifiedBalance, 'refreshedAt' | 'currentApyDecimal'> =
  {
    totalUsdc: '0.00',
    idleUsdc: '0.00',
    stakedUsdc: '0.00',
    accruedYieldUsdc: '0.00',
    stubMode: true,
  };

export class StubVaultStateReader implements VaultStateReader {
  constructor(private readonly reason: string) {}

  async readUserVault(userId: string): Promise<UnifiedBalance> {
    logger.debug(
      { userId, reason: this.reason },
      '[STUB] earn-vault read — program not deployed'
    );
    return {
      ...STUB_BALANCE,
      currentApyDecimal: null,
      refreshedAt: Math.floor(Date.now() / 1000),
    };
  }
}

/**
 * On-chain reader: derives UserVault PDA + Vault PDA + reads via JSON-RPC.
 *
 * Implementation TODO (gated by #15 program shipping):
 *   - decode UserVault account: { stakedShares: u64, lastHarvestTick: i64 }
 *   - decode Vault account:     { totalShares: u64, totalStakedUsdc: u64,
 *                                  lastHarvestTick: i64, apyBps: u16 }
 *   - unified balance = idle (from wallet-service) + stakedShares/totalShares
 *                       × totalStakedUsdc + accruedYield = stakedShares ×
 *                       elapsed × apy / SECONDS_PER_YEAR
 *
 * For now the reader exists with the right interface but defers reads to
 * the stub until program-id is known. This is the scaffold-defensive shape
 * (the same pattern used in services/wallet for on-chain reads — code is
 * present + tested; behavior swaps via env). See ADR 0021 pattern #4.
 */
export class OnChainVaultStateReader implements VaultStateReader {
  constructor(
    private readonly programId: string,
    readonly vUsdcMint: string,
    readonly rpcUrl: string
  ) {
    logger.info(
      { programId, vUsdcMint, rpcUrl },
      'OnChainVaultStateReader initialized (RPC reads deferred until #15 ships)'
    );
  }

  async readUserVault(userId: string): Promise<UnifiedBalance> {
    // Scaffold-defensive: even though programId is set, the program may not
    // be deployed yet (devnet vs mainnet vs unset). When the actual RPC
    // call lands, replace this with a getAccountInfo call against the
    // derived UserVault PDA + decode per ADR 0012.
    logger.warn(
      { userId, programId: this.programId },
      'on-chain RPC read not yet implemented — returning stub-shaped empty state until #15 lands'
    );
    return {
      totalUsdc: '0.00',
      idleUsdc: '0.00',
      stakedUsdc: '0.00',
      accruedYieldUsdc: '0.00',
      currentApyDecimal: null,
      stubMode: true, // remains stub until decoder shipped under #15
      refreshedAt: Math.floor(Date.now() / 1000),
    };
  }
}

export function buildVaultStateReader(): VaultStateReader {
  const programId = config.EARN_VAULT_PROGRAM_ID;
  const vUsdcMint = config.V_USDC_MINT;
  const rpcUrl = config.SOLANA_RPC_URL;

  if (!programId || !vUsdcMint) {
    return new StubVaultStateReader(
      !programId ? 'EARN_VAULT_PROGRAM_ID unset' : 'V_USDC_MINT unset'
    );
  }

  return new OnChainVaultStateReader(programId, vUsdcMint, rpcUrl);
}
