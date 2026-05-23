import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

import { createClaimForTransfer } from './claim-bridge.service';

const POLL_INTERVAL_MS = 30_000;
const BATCH_SIZE = 50;
const MAX_AGE_MINUTES = 60 * 24 * 7;

let pollerHandle: NodeJS.Timeout | null = null;

export async function tickReconciler(): Promise<{
  found: number;
  retried: number;
  acked: number;
}> {
  const cutoff = new Date(Date.now() - MAX_AGE_MINUTES * 60_000);
  const pending = await prisma.transfer.findMany({
    where: {
      claimBridgeAckedAt: null,
      createdAt: { gte: cutoff },
    },
    take: BATCH_SIZE,
    orderBy: { createdAt: 'asc' },
  });

  if (pending.length === 0) {
    return { found: 0, retried: 0, acked: 0 };
  }

  let retried = 0;
  let acked = 0;
  for (const t of pending) {
    retried++;
    const result = await createClaimForTransfer({
      transferId: t.id,
      senderId: t.senderId,
      recipientPhone: t.recipientPhone,
      claimCode: t.claimCode,
      amountValue: t.amount,
      amountCurrency: t.currency,
    });
    if (result) {
      await prisma.transfer.update({
        where: { id: t.id },
        data: { claimBridgeAckedAt: new Date() },
      });
      acked++;
    }
  }
  logger.info(
    { found: pending.length, retried, acked },
    'claim-reconciler tick'
  );
  return { found: pending.length, retried, acked };
}

export function startClaimReconciler(): void {
  if (pollerHandle) {
    logger.warn('claim-reconciler already running');
    return;
  }
  pollerHandle = setInterval(() => {
    tickReconciler().catch(err =>
      logger.error({ err }, 'claim-reconciler tick failed')
    );
  }, POLL_INTERVAL_MS);
  logger.info({ intervalMs: POLL_INTERVAL_MS }, 'claim-reconciler started');
}

export function stopClaimReconciler(): void {
  if (pollerHandle) {
    clearInterval(pollerHandle);
    pollerHandle = null;
    logger.info('claim-reconciler stopped');
  }
}
