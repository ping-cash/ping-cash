import { loadConfig } from '@ping/config';
import { PrivyClient } from '@privy-io/server-auth';

import { AuthErrors } from '../utils/errors';
import { logger } from '../utils/logger';

const config = loadConfig();

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
export async function bindPhoneToWallet(phone: string): Promise<PrivyUserBindResult> {
  const client = getClient();

  if (!client) {
    const stubAddr = `Stub${Buffer.from(phone).toString('hex').slice(0, 40)}`;
    logger.info({ phone, stubAddr }, '[STUB MODE] Would create/fetch Privy wallet');
    return {
      privyUserId: `did:privy:stub:${phone}`,
      walletAddress: stubAddr,
      isNewUser: true,
    };
  }

  try {
    // Look up or create user by phone
    let user;
    let isNewUser = false;
    try {
      user = await client.getUserByPhoneNumber(phone);
    } catch {
      // User doesn't exist, create
      isNewUser = true;
      user = await client.importUser({
        linkedAccounts: [{ type: 'phone', number: phone }],
        createSolanaWallet: true,
      });
    }

    if (!user) {
      throw AuthErrors.PrivyFailure({ message: 'Privy user lookup returned null' });
    }

    // Find the Solana wallet
    const solanaWallet = user.linkedAccounts.find(
      (a: { type: string }) => a.type === 'wallet' && 'chainType' in a && (a as { chainType: string }).chainType === 'solana',
    ) as { address: string } | undefined;

    if (!solanaWallet) {
      throw AuthErrors.PrivyFailure({ message: 'No Solana wallet found on user' });
    }

    logger.info(
      { privyUserId: user.id, walletAddress: solanaWallet.address, isNewUser },
      'Privy wallet bound',
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
