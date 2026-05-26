import { describe, it, expect } from 'vitest';

import { buildSendIntent } from './send.service';

describe('send.service.buildSendIntent', () => {
  const VALID_A = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  const VALID_B = 'So11111111111111111111111111111111111111112';

  it('returns serialized tx + meta for valid wallets', async () => {
    const intent = await buildSendIntent(VALID_A, VALID_B, '10.00');
    expect(intent.senderWallet).toBe(VALID_A);
    expect(intent.recipientWallet).toBe(VALID_B);
    expect(intent.amountUsdc).toBe('10.00');
    expect(intent.serializedTransaction).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(intent.meta.mint).toBe(
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    );
    expect(intent.meta.program).toBe(
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
    );
    expect(intent.meta.associatedTokenProgram).toBe(
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
    );
    expect(intent.meta.decimals).toBe(6);
    expect(intent.meta.amountAtomic).toBe('10000000'); // 10 USDC * 10^6
    // ATA derivation is deterministic per (mint, owner) pair — sanity check non-empty
    expect(intent.meta.senderAta).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(intent.meta.recipientAta).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(intent.meta.senderAta).not.toBe(intent.meta.recipientAta);
    expect(intent.expiresInSeconds).toBe(60);
  });

  it('converts USDC amount to atomic units using 6 decimals', async () => {
    const small = await buildSendIntent(VALID_A, VALID_B, '0.5');
    expect(small.meta.amountAtomic).toBe('500000');
    const big = await buildSendIntent(VALID_A, VALID_B, '1234.56');
    expect(big.meta.amountAtomic).toBe('1234560000');
  });

  it('rejects invalid sender address', async () => {
    await expect(
      buildSendIntent('not-a-pubkey', VALID_B, '5.00')
    ).rejects.toThrow();
  });

  it('rejects invalid recipient address', async () => {
    await expect(
      buildSendIntent(VALID_A, 'not-a-pubkey', '5.00')
    ).rejects.toThrow();
  });
});
