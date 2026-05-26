import { describe, expect, it, vi } from 'vitest';

vi.mock('@ping/config', () => ({
  loadConfig: () => ({
    EARN_VAULT_PROGRAM_ID: undefined,
    V_USDC_MINT: undefined,
    SOLANA_RPC_URL: 'https://api.test',
  }),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  StubVaultStateReader,
  OnChainVaultStateReader,
  buildVaultStateReader,
} from './vault.service';

describe('StubVaultStateReader', () => {
  it('returns zero-balance unified state with stubMode true', async () => {
    const r = new StubVaultStateReader('test-reason');
    const result = await r.readUserVault('user-123');
    expect(result.totalUsdc).toBe('0.00');
    expect(result.idleUsdc).toBe('0.00');
    expect(result.stakedUsdc).toBe('0.00');
    expect(result.accruedYieldUsdc).toBe('0.00');
    expect(result.currentApyDecimal).toBeNull();
    expect(result.stubMode).toBe(true);
    expect(result.refreshedAt).toBeGreaterThan(0);
  });
});

describe('OnChainVaultStateReader', () => {
  it('returns scaffold-defensive empty state until #15 ships the decoder', async () => {
    const r = new OnChainVaultStateReader(
      'EvProgr4mPubKey00000000000000000000000000000',
      'EvUsdc00000000000000000000000000000000000000',
      'https://api.test'
    );
    const result = await r.readUserVault('user-456');
    expect(result.totalUsdc).toBe('0.00');
    expect(result.stubMode).toBe(true); // intentional — decoder not yet shipped
    expect(result.currentApyDecimal).toBeNull();
  });
});

describe('buildVaultStateReader', () => {
  it('returns StubVaultStateReader when EARN_VAULT_PROGRAM_ID is unset', () => {
    const r = buildVaultStateReader();
    expect(r).toBeInstanceOf(StubVaultStateReader);
  });
});
