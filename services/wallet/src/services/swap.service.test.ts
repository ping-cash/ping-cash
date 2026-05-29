/**
 * Unit tests for swap.service.ts — Pyth + Jupiter quote shape + stub
 * fallback + MEV-tilt sanity check (#89).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { buildSwapQuote } from './swap.service';

describe('buildSwapQuote', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns stub fallback shape when Jupiter is unreachable', async () => {
    // Force fetch to reject Jupiter call (mocking fetch globally).
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error('network down')) as never;

    const q = await buildSwapQuote({
      fromSymbol: 'USDC',
      toSymbol: 'PING',
      toMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      amountUsdc: '10',
    });

    expect(q.isLive).toBe(false);
    expect(q.inputAmount).toBe('10');
    expect(q.outputAmount).toBe('117.65'); // stubRate 0.085 → 10/0.085 ≈ 117.65
    expect(q.rate).toBe('0.085000');
    expect(q.route).toEqual([]);
    expect(q.feeBps).toBe(0);
    expect(q.slippageBps).toBe(50); // default
  });

  it('honors custom slippageBps', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error('network down')) as never;
    const q = await buildSwapQuote({
      fromSymbol: 'USDC',
      toSymbol: 'PING',
      toMint: 'So11111111111111111111111111111111111111112',
      amountUsdc: '1',
      slippageBps: 100,
    });
    expect(q.slippageBps).toBe(100);
  });

  it('throws when amount is zero', async () => {
    await expect(
      buildSwapQuote({
        fromSymbol: 'USDC',
        toSymbol: 'PING',
        toMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        amountUsdc: '0',
      })
    ).rejects.toThrow('amountUsdc must be > 0');
  });

  it('parses Jupiter response into the public shape', async () => {
    const responses: Record<string, unknown> = {
      pyth: {
        parsed: [
          {
            id: 'eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
            price: { price: '99962000', expo: -8 }, // 0.99962
          },
        ],
      },
      jupiter: {
        inAmount: '10000000', // 10 USDC (6 decimals)
        outAmount: '117000000000', // 117 output @ 9 decimals
        routePlan: [
          { swapInfo: { label: 'Orca' } },
          { swapInfo: { label: 'Raydium' } },
        ],
        slippageBps: 50,
        platformFee: { amount: '0', feeBps: 0 },
      },
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const body =
        typeof url === 'string' && url.includes('hermes.pyth.network')
          ? responses.pyth
          : responses.jupiter;
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200 })
      );
    }) as never;

    // Use distinct mints so MEV-tilt sanity (USDC→USDC only) doesn't fire.
    const q = await buildSwapQuote({
      fromSymbol: 'USDC',
      toSymbol: 'PING',
      toMint: 'So11111111111111111111111111111111111111112',
      amountUsdc: '10',
    });

    expect(q.isLive).toBe(true);
    expect(q.inputAmount).toBe('10.00');
    expect(q.outputAmount).toBe('117.0000');
    expect(q.route).toEqual(['Orca', 'Raydium']);
    expect(q.inputPriceUsd).toBe('0.999620');
  });
});
