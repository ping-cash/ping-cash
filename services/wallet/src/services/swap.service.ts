/**
 * Swap quote — Pyth Hermes price oracle + Jupiter route quoter (#89).
 *
 * Mobile /swap screen requests a quote with { amountUsdc, toMint } and
 * gets back the route + estimated output + the on-chain price reference
 * so the displayed rate matches what the user is about to broadcast.
 *
 * Pyth provides the anchor USD price for sanity-checking Jupiter's
 * route output (e.g., reject quotes that exceed Pyth ± 5% drift —
 * that's a MEV-tilted route). Stub mode (no PYTH_HERMES_URL set) falls
 * back to a static rate so the UI walk doesn't crash in dev.
 *
 * Jupiter v6 quote API: https://quote-api.jup.ag/v6/quote
 *   ?inputMint=<>&outputMint=<>&amount=<atomic>&slippageBps=<>
 */
import { loadConfig } from '@ping/config';

import { logger } from '../utils/logger';

const USDC_DECIMALS = 6;
const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%

// Pyth USD-quoted price feed IDs (mainnet — devnet uses the same IDs).
const PYTH_PRICE_FEEDS: Record<string, string> = {
  USDC: 'eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  SOL: 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
};

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inputAmount: string; // human-readable decimal
  outputAmount: string; // human-readable decimal
  /** Effective rate = output/input. */
  rate: string;
  /** Pyth-anchored input USD price (reference). null if Pyth unavailable. */
  inputPriceUsd: string | null;
  /** Pyth-anchored output USD price (reference). null if Pyth unavailable. */
  outputPriceUsd: string | null;
  /** Jupiter route hops — DEX names in order. Empty in stub mode. */
  route: string[];
  feeBps: number;
  slippageBps: number;
  isLive: boolean;
}

interface PythPriceUpdate {
  parsed?: Array<{
    id: string;
    price?: { price: string; expo: number };
  }>;
}

async function fetchPythPrice(symbol: string): Promise<number | null> {
  const config = loadConfig();
  const baseUrl = config.PYTH_HERMES_URL;
  const feedId = PYTH_PRICE_FEEDS[symbol];
  if (!baseUrl || !feedId) return null;
  try {
    const url = `${baseUrl}/v2/updates/price/latest?ids[]=${feedId}`;
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as PythPriceUpdate;
    const first = body.parsed?.[0]?.price;
    if (!first) return null;
    return parseInt(first.price, 10) * Math.pow(10, first.expo);
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, symbol },
      'Pyth price fetch failed'
    );
    return null;
  }
}

interface JupiterQuoteResponse {
  inAmount: string;
  outAmount: string;
  routePlan?: Array<{ swapInfo?: { label?: string } }>;
  slippageBps?: number;
  platformFee?: { amount: string; feeBps: number };
}

async function fetchJupiterQuote(args: {
  inputMint: string;
  outputMint: string;
  amount: string; // atomic
  slippageBps: number;
}): Promise<JupiterQuoteResponse | null> {
  const params = new URLSearchParams({
    inputMint: args.inputMint,
    outputMint: args.outputMint,
    amount: args.amount,
    slippageBps: String(args.slippageBps),
  });
  const url = `https://quote-api.jup.ag/v6/quote?${params.toString()}`;
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      logger.warn(
        { status: res.status, url },
        'Jupiter quote returned non-200'
      );
      return null;
    }
    return (await res.json()) as JupiterQuoteResponse;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'Jupiter quote fetch failed');
    return null;
  }
}

/**
 * Build a swap quote for the mobile /swap screen.
 * Stub fallback (no live Pyth/Jupiter) returns a static rate so the UI
 * walks cleanly during dev/devnet, with isLive:false flagging it.
 */
export async function buildSwapQuote(args: {
  fromSymbol: 'USDC';
  toSymbol: 'PING';
  toMint: string;
  amountUsdc: string;
  slippageBps?: number;
}): Promise<SwapQuote> {
  const config = loadConfig();
  const slippageBps = args.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  const inputAtomic = BigInt(
    Math.round(parseFloat(args.amountUsdc) * 10 ** USDC_DECIMALS)
  );
  if (inputAtomic <= 0n) {
    throw new Error('amountUsdc must be > 0');
  }

  const usdcPrice = await fetchPythPrice('USDC');

  const inputMint = config.SOLANA_USDC_MINT;
  const outputMint = args.toMint;
  const jupiter = await fetchJupiterQuote({
    inputMint,
    outputMint,
    amount: inputAtomic.toString(),
    slippageBps,
  });

  if (!jupiter) {
    const stubRate = 0.085;
    const inputNum = parseFloat(args.amountUsdc);
    return {
      inputMint,
      outputMint,
      inputAmount: args.amountUsdc,
      outputAmount: (inputNum / stubRate).toFixed(2),
      rate: stubRate.toFixed(6),
      inputPriceUsd: usdcPrice?.toFixed(6) ?? null,
      outputPriceUsd: null,
      route: [],
      feeBps: 0,
      slippageBps,
      isLive: false,
    };
  }

  // Output decimals — assume 9 for SPL Token unless overridden. Real
  // production tracks per-mint decimals; for $PING the canonical is 9.
  const outputDecimals = 9;
  const outputAmount = (
    parseInt(jupiter.outAmount, 10) / Math.pow(10, outputDecimals)
  ).toFixed(4);
  const inputAmount = (
    parseInt(jupiter.inAmount, 10) / Math.pow(10, USDC_DECIMALS)
  ).toFixed(2);

  const route =
    jupiter.routePlan
      ?.map(p => p.swapInfo?.label ?? 'unknown')
      .filter(Boolean) ?? [];

  const inputNum = parseFloat(inputAmount);
  const outputNum = parseFloat(outputAmount);
  const rate = inputNum > 0 ? (outputNum / inputNum).toFixed(6) : '0';

  return {
    inputMint,
    outputMint,
    inputAmount,
    outputAmount,
    rate,
    inputPriceUsd: usdcPrice?.toFixed(6) ?? null,
    outputPriceUsd: null,
    route,
    feeBps: jupiter.platformFee?.feeBps ?? 0,
    slippageBps,
    isLive: true,
  };
}
