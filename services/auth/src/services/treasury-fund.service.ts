/**
 * Fires a non-blocking server-to-server call to wallet-service to fund
 * a freshly-created wallet from the treasury. Runs only when the wallet
 * binding reported isNewUser=true; failures are logged but never bubbled.
 *
 * Auth-service must not block signup on this call — the user is fully
 * onboarded with an empty wallet either way. Treasury fund is an
 * eager bootstrap, not part of the signup contract.
 */
import { loadConfig } from '@ping/config';

import { logger } from '../utils/logger';

const config = loadConfig();

export function maybeFundFromTreasury(walletAddress: string): void {
  if (!config.TREASURY_FUND_ENABLED) {
    logger.info(
      { walletAddress },
      'Treasury fund skipped — TREASURY_FUND_ENABLED=false'
    );
    return;
  }
  if (!config.INTERNAL_SERVICE_SECRET) {
    logger.warn(
      { walletAddress },
      'Treasury fund enabled but INTERNAL_SERVICE_SECRET unset — cannot call wallet-service'
    );
    return;
  }
  logger.info(
    { walletAddress, walletServiceUrl: config.WALLET_SERVICE_URL },
    'Treasury fund triggered (fire-and-forget) for new wallet'
  );
  // Fire-and-forget — must not delay token mint.
  void fundOnce(walletAddress).catch(err => {
    logger.error(
      { err: (err as Error).message, walletAddress },
      'Treasury fund call to wallet-service failed'
    );
  });
}

async function fundOnce(walletAddress: string): Promise<void> {
  const secret = config.INTERNAL_SERVICE_SECRET;
  if (!secret) return;
  const url = `${config.WALLET_SERVICE_URL}/wallet/internal/fund-new-wallet`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-secret': secret,
    },
    body: JSON.stringify({ recipientAddress: walletAddress }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    funded?: boolean;
    txSignature?: string;
    reason?: string;
  };
  if (res.ok && body.funded) {
    logger.info(
      { walletAddress, txSignature: body.txSignature },
      'Treasury funded new wallet'
    );
  } else {
    logger.warn(
      { walletAddress, status: res.status, reason: body.reason },
      'Treasury fund skipped or failed'
    );
  }
}
