/**
 * Best-effort bridge from claim-service into notify-service so the
 * SENDER receives a push when their recipient successfully claims
 * ("Joe claimed your $50") — #81.
 *
 * Fire-and-forget: a failure here MUST NOT roll back the claim or
 * delay the recipient's "Sent!" response. The reconciler-friendly
 * pattern matches dispatchToOfframp.
 */
import { loadConfig } from '@ping/config';

import { logger } from '../utils/logger';

const config = loadConfig();

const NOTIFY_SERVICE_URL =
  process.env.NOTIFY_SERVICE_URL ||
  'http://notify-service.ping.svc.cluster.local';

export interface SenderClaimedInput {
  senderUserId: string;
  amount: string;
  recipientPhone?: string;
  recipientName?: string;
  localAmount?: string;
  localCurrency?: string;
  method?: string;
}

export function notifySenderClaimed(input: SenderClaimedInput): void {
  // The notify-service call is best-effort. We never await it in the
  // caller; the cash-out HTTP response returns immediately.
  void (async () => {
    try {
      const res = await fetch(`${NOTIFY_SERVICE_URL}/notify/sender-claimed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      const body = await res.json().catch(() => ({}));
      logger.info(
        { senderUserId: input.senderUserId, status: res.status, body },
        'sender-claimed notify dispatched'
      );
    } catch (err) {
      logger.warn(
        { err: (err as Error).message, senderUserId: input.senderUserId },
        'sender-claimed notify failed (non-blocking)'
      );
    }
  })();
}

// Force config evaluated so NOTIFY_SERVICE_URL respects env at boot.
void config;
