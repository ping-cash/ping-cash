import { loadConfig } from '@ping/config';
import { PrivyClient } from '@privy-io/server-auth';

import { AuthErrors } from '../utils/errors';
import { logger } from '../utils/logger';

import { isTestPhone } from './twilio.service';

const config = loadConfig();

/**
 * Deterministic 32-byte synthetic Solana-shaped address for test phones.
 * Same phone → same address across runs, so corridor smoke + Maestro can
 * exercise the full wallet flow without consuming a Privy user-cap slot.
 * 32-char hex padded base58-shaped is fine for our wiring — the address
 * never holds real funds, never appears on-chain.
 */
function stubAddressForTestPhone(phone: string): string {
  const hex = Buffer.from(phone).toString('hex').padEnd(64, '0').slice(0, 64);
  return `Stub${hex.slice(0, 40)}`;
}

let _client: PrivyClient | null = null;

function getClient() {
  if (_client) return _client;
  const appId = config.PRIVY_APP_ID;
  const appSecret = config.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    logger.warn('Privy credentials not set — using stub mode');
    return null;
  }
  _client = new PrivyClient(appId, appSecret);
  return _client;
}

export interface PrivyUserBindResult {
  privyUserId: string;
  walletAddress: string;
  isNewUser: boolean;
}

/**
 * Create or fetch a Privy user from a verified phone number.
 * Returns the Solana wallet address (MPC-managed by Privy + user device).
 *
 * Per ADR 0004 (Privy MPC wallets):
 *   2-of-3 threshold (device shard + Privy shard + recovery shard).
 *   We never have unilateral control over the wallet.
 *
 * In stub mode, returns a fake wallet address.
 */
export async function bindPhoneToWallet(
  phone: string
): Promise<PrivyUserBindResult> {
  // Test phones (+447700900 Ofcom drama range — see OTP_TEST_PHONES)
  // bypass Privy entirely so corridor smoke + Maestro launches don't
  // consume the Privy user-cap quota. Symmetric with twilio.service.ts
  // bypassing OTP send/verify for these prefixes. Production phones
  // still go through the full Privy MPC flow below.
  if (isTestPhone(phone)) {
    const stubAddr = stubAddressForTestPhone(phone);
    logger.info(
      { phone, stubAddr },
      '[TEST PHONE] Bypassing Privy importUser — deterministic stub wallet'
    );
    return {
      privyUserId: `did:test:${Buffer.from(phone).toString('hex').slice(0, 32)}`,
      walletAddress: stubAddr,
      isNewUser: true,
    };
  }

  const client = getClient();

  if (!client) {
    const stubAddr = stubAddressForTestPhone(phone);
    logger.info(
      { phone, stubAddr },
      '[STUB MODE] Would create/fetch Privy wallet'
    );
    return {
      privyUserId: `did:privy:stub:${phone}`,
      walletAddress: stubAddr,
      isNewUser: true,
    };
  }

  try {
    // Look up or create user by phone. getUserByPhoneNumber returns null
    // (NOT throws) when user doesn't exist — we must check explicitly.
    let user;
    let isNewUser = false;
    try {
      user = await client.getUserByPhoneNumber(phone);
    } catch (lookupErr) {
      logger.warn(
        { err: (lookupErr as Error).message, phone },
        'Privy getUserByPhoneNumber threw — treating as not-found'
      );
      user = null;
    }
    if (!user) {
      isNewUser = true;
      user = await client.importUser({
        linkedAccounts: [{ type: 'phone', number: phone }],
        createSolanaWallet: true,
      });
    }

    if (!user) {
      throw AuthErrors.PrivyFailure({
        message: 'Privy user creation returned null after import',
      });
    }

    // Find the Solana wallet
    const solanaWallet = user.linkedAccounts.find(
      (a: { type: string }) =>
        a.type === 'wallet' &&
        'chainType' in a &&
        (a as { chainType: string }).chainType === 'solana'
    ) as { address: string } | undefined;

    if (!solanaWallet) {
      throw AuthErrors.PrivyFailure({
        message: 'No Solana wallet found on user',
      });
    }

    logger.info(
      { privyUserId: user.id, walletAddress: solanaWallet.address, isNewUser },
      'Privy wallet bound'
    );

    return {
      privyUserId: user.id,
      walletAddress: solanaWallet.address,
      isNewUser,
    };
  } catch (err) {
    logger.error({ err, phone }, 'Privy bindPhoneToWallet failed');
    if (err instanceof Error && err.name === 'AppError') throw err;
    throw AuthErrors.PrivyFailure({ message: (err as Error).message });
  }
}
