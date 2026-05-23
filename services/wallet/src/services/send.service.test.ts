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
    expect(intent.expiresInSeconds).toBe(60);
  });

  it('rejects invalid sender address', async () => {
    await expect(buildSendIntent('not-a-pubkey', VALID_B, '5.00')).rejects.toThrow();
  });

  it('rejects invalid recipient address', async () => {
    await expect(buildSendIntent(VALID_A, 'not-a-pubkey', '5.00')).rejects.toThrow();
  });
});
