import { createHash } from 'node:crypto';

import { loadConfig } from '@ping/config';
import { PrivyClient } from '@privy-io/server-auth';
import { Keypair } from '@solana/web3.js';

import { AuthErrors } from '../utils/errors';
import { logger } from '../utils/logger';

import { isTestPhone } from './twilio.service';

const config = loadConfig();

/**
 * Deterministic ed25519 Solana wallet for test phones. Same phone →
 * same wallet across runs, so corridor smoke + Maestro can exercise
 * the full wallet/balance + send/claim flows against a REAL base58
 * pubkey without consuming a Privy user-cap slot. The wallet sits on
 * devnet with no funds — every Solana RPC call against it succeeds
 * (returns zero balance) instead of throwing INVALID_ADDRESS for a
 * synthetic non-base58 string.
 *
 * Seed = sha256("ping-test-wallet-v1:" + phone). The "-v1" tag lets
 * us rotate test-wallet identity without changing the phone prefix
 * if a leaked seed ever needs to be revoked.
 */
function stubAddressForTestPhone(phone: string): string {
  const seed = createHash('sha256')
    .update('ping-test-wallet-v1:' + phone)
    .digest();
  return Keypair.fromSeed(seed.slice(0, 32)).publicKey.toBase58();
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
