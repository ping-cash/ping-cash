/**
 * Self-built OFAC SDN screener (#75 — Path B for #68).
 *
 * Pulls the public US Treasury OFAC SDN consolidated XML feed every
 * 4h, parses crypto wallet addresses (BTC / ETH / XBT / XRP / ETC /
 * USDT / USDC / SOL / ZEC / BSC / TRX / etc.) out of the
 * `<digitalCurrencyAddress currency="<X>">value</digitalCurrencyAddress>`
 * elements, and stores them in a Redis sorted set keyed by listing
 * date for fast O(1) membership checks.
 *
 * Why self-built: Chainalysis KYT costs $30k+/yr. The Treasury feed
 * is free + public + statutory. Combining a local SDN lookup with the
 * existing Chainalysis path (when configured) gives defense-in-depth:
 * a wallet is "hit" if EITHER source flags it.
 *
 * Refresh cadence: every 4h. The SDN list updates a few times per
 * week, so 4h is well within the statutory expectation while keeping
 * the Treasury server polite.
 */
import { loadConfig } from '@ping/config';
import IORedis, { type Redis } from 'ioredis';

import { logger } from '../utils/logger';

const config = loadConfig();

const SDN_XML_URL =
  process.env.OFAC_SDN_XML_URL ||
  'https://www.treasury.gov/ofac/downloads/sdn.xml';

const REDIS_SET_KEY = 'ofac:sdn:addresses';
const REDIS_META_KEY = 'ofac:sdn:meta';
const REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4h

let _redis: Redis | null = null;
let _refreshTimer: NodeJS.Timeout | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = config.REDIS_URL;
  if (!url) return null;
  _redis = new IORedis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  _redis.on('error', err => {
    logger.warn({ err: err.message }, 'OFAC redis error');
  });
  return _redis;
}

export interface OfacScreenResult {
  matched: boolean;
  listingDate?: string;
  programs?: string[];
  source: 'ofac-direct';
  checkedAt: number;
}

/**
 * Check if an address is on the local OFAC SDN sorted set. Returns
 * matched:false when Redis isn't reachable OR the list hasn't been
 * loaded yet — the caller should treat a hit as definitive but never
 * treat a clean as a guarantee of compliance (Chainalysis path stays
 * in place as the secondary source).
 */
export async function screenAddressAgainstSdn(
  address: string
): Promise<OfacScreenResult> {
  const now = Math.floor(Date.now() / 1000);
  const redis = getRedis();
  if (!redis) {
    return { matched: false, source: 'ofac-direct', checkedAt: now };
  }
  try {
    const score = await redis.zscore(REDIS_SET_KEY, address);
    if (score == null) {
      return { matched: false, source: 'ofac-direct', checkedAt: now };
    }
    const programsRaw = await redis.hget(`${REDIS_SET_KEY}:programs`, address);
    const programs = programsRaw ? programsRaw.split(',') : [];
    // Score holds the unix timestamp when the address landed on the list.
    const listingDate = new Date(parseInt(score, 10) * 1000)
      .toISOString()
      .slice(0, 10);
    return {
      matched: true,
      listingDate,
      programs,
      source: 'ofac-direct',
      checkedAt: now,
    };
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, address },
      'OFAC SDN redis lookup failed'
    );
    return { matched: false, source: 'ofac-direct', checkedAt: now };
  }
}

/**
 * Pull the SDN XML, extract crypto addresses, refresh the Redis sorted
 * set. Idempotent — replaces the full set so removals from the SDN
 * propagate too.
 */
export async function refreshOfacSdnFeed(): Promise<{
  fetched: boolean;
  count: number;
  durationMs: number;
}> {
  const startedAt = Date.now();
  const redis = getRedis();
  if (!redis) {
    return { fetched: false, count: 0, durationMs: 0 };
  }

  let xml: string;
  try {
    const res = await fetch(SDN_XML_URL, {
      headers: {
        accept: 'application/xml',
        'user-agent': 'ping-cash-ofac-screener/1.0',
      },
    });
    if (!res.ok) {
      logger.warn(
        { status: res.status, url: SDN_XML_URL },
        'OFAC SDN feed non-200'
      );
      return { fetched: false, count: 0, durationMs: Date.now() - startedAt };
    }
    xml = await res.text();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'OFAC SDN feed fetch failed');
    return { fetched: false, count: 0, durationMs: Date.now() - startedAt };
  }

  const entries = parseSdnAddresses(xml);
  if (entries.length === 0) {
    logger.warn(
      { xmlBytes: xml.length },
      'OFAC SDN parse yielded zero addresses'
    );
    return { fetched: true, count: 0, durationMs: Date.now() - startedAt };
  }

  const pipeline = redis.pipeline();
  pipeline.del(REDIS_SET_KEY);
  pipeline.del(`${REDIS_SET_KEY}:programs`);
  for (const e of entries) {
    pipeline.zadd(REDIS_SET_KEY, e.listedTs, e.address);
    if (e.programs.length > 0) {
      pipeline.hset(
        `${REDIS_SET_KEY}:programs`,
        e.address,
        e.programs.join(',')
      );
    }
  }
  const refreshedAt = Math.floor(Date.now() / 1000);
  pipeline.hset(REDIS_META_KEY, 'refreshedAt', String(refreshedAt));
  pipeline.hset(REDIS_META_KEY, 'count', String(entries.length));
  await pipeline.exec();

  const durationMs = Date.now() - startedAt;
  logger.info(
    { count: entries.length, durationMs, url: SDN_XML_URL },
    'OFAC SDN feed refreshed'
  );
  return { fetched: true, count: entries.length, durationMs };
}

export interface ParsedSdnAddress {
  address: string;
  listedTs: number; // unix seconds
  programs: string[];
}

/**
 * Lightweight SDN XML parser — extracts the digitalCurrencyAddress
 * elements + the parent entity's program list + publishInformation
 * date. Avoids a heavyweight XML library; OFAC's schema is stable.
 *
 * The current SDN XML uses idTypes for crypto addresses (e.g.,
 * "Digital Currency Address - XBT", "Digital Currency Address - ETH",
 * "Digital Currency Address - USDT", etc.) inside <id> elements. We
 * match by the type name pattern so new currencies surface automatically.
 */
export function parseSdnAddresses(xml: string): ParsedSdnAddress[] {
  // Default listed date if the SDN entry doesn't include one — fall
  // back to today (the feed's own publish date is in <Publish_Date>,
  // we use file-fetch time as an upper bound).
  const fileTs = Math.floor(Date.now() / 1000);

  const out: ParsedSdnAddress[] = [];

  // Each sdnEntry block can carry one or more crypto-address id elements.
  // Use a non-greedy match per entry; OFAC's XML doesn't nest sdnEntry.
  const entryRegex = /<sdnEntry\b[\s\S]*?<\/sdnEntry>/g;
  const idTypeRegex = /<idType>\s*Digital Currency Address[\s\S]*?<\/idType>/i;
  const idNumberRegex = /<idNumber>([\s\S]*?)<\/idNumber>/i;
  const programRegex = /<program>([\s\S]*?)<\/program>/gi;
  const publishDateRegex =
    /<publishInformation>[\s\S]*?<Date_Published>\s*([0-9-/]+)\s*<\/Date_Published>/i;

  let match: RegExpExecArray | null;
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[0];
    if (!idTypeRegex.test(block)) continue;

    const programs: string[] = [];
    let progMatch: RegExpExecArray | null;
    while ((progMatch = programRegex.exec(block)) !== null) {
      const p = progMatch[1].trim();
      if (p) programs.push(p);
    }

    let listedTs = fileTs;
    const pubMatch = publishDateRegex.exec(block);
    if (pubMatch) {
      const parsed = Date.parse(pubMatch[1]);
      if (!Number.isNaN(parsed)) listedTs = Math.floor(parsed / 1000);
    }

    // An entry may have many <id> elements; only the ones with the
    // Digital Currency Address idType count. Pull each idNumber whose
    // surrounding <id> contains the digital-currency idType.
    const idRegex = /<id\b[\s\S]*?<\/id>/g;
    let idMatch: RegExpExecArray | null;
    while ((idMatch = idRegex.exec(block)) !== null) {
      const idBlock = idMatch[0];
      if (!idTypeRegex.test(idBlock)) continue;
      const numMatch = idNumberRegex.exec(idBlock);
      if (!numMatch) continue;
      const address = numMatch[1].trim();
      if (!address) continue;
      out.push({ address, listedTs, programs });
    }
  }

  return out;
}

/**
 * Start the periodic refresh timer. Idempotent — if already running,
 * resets the interval. Returns the unsubscribe function for cleanup
 * in tests.
 */
export function startOfacRefreshLoop(opts?: {
  intervalMs?: number;
  immediate?: boolean;
}): () => void {
  if (_refreshTimer) {
    clearInterval(_refreshTimer);
    _refreshTimer = null;
  }
  const intervalMs = opts?.intervalMs ?? REFRESH_INTERVAL_MS;
  if (opts?.immediate !== false) {
    void refreshOfacSdnFeed().catch(err => {
      logger.warn(
        { err: (err as Error).message },
        'OFAC initial refresh failed'
      );
    });
  }
  _refreshTimer = setInterval(() => {
    void refreshOfacSdnFeed().catch(err => {
      logger.warn(
        { err: (err as Error).message },
        'OFAC periodic refresh failed'
      );
    });
  }, intervalMs);
  return () => {
    if (_refreshTimer) {
      clearInterval(_refreshTimer);
      _refreshTimer = null;
    }
  };
}

/**
 * For tests + healthcheck.
 */
export async function getOfacFeedMeta(): Promise<{
  refreshedAt: number | null;
  count: number | null;
}> {
  const redis = getRedis();
  if (!redis) return { refreshedAt: null, count: null };
  try {
    const [refreshedAtRaw, countRaw] = await redis.hmget(
      REDIS_META_KEY,
      'refreshedAt',
      'count'
    );
    return {
      refreshedAt: refreshedAtRaw ? parseInt(refreshedAtRaw, 10) : null,
      count: countRaw ? parseInt(countRaw, 10) : null,
    };
  } catch {
    return { refreshedAt: null, count: null };
  }
}
