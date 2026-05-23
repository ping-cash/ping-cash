/**
 * Double-entry ledger service.
 *
 * Every commit() call writes 2+ entries summing to zero.
 * Outbox events for downstream services published in same transaction.
 *
 * Per PRINCIPLES § 11 (Trust internal code; validate at boundaries):
 *   We validate the balance invariant at the boundary (commit()), then
 *   trust the database to enforce it via the schema constraint + trigger.
 */
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

// eslint-disable-next-line import/order
import { Decimal } from '.prisma/ledger-client/runtime/library';
import { validateBalanced, type EntryType, type LedgerEntryInput } from './validation';

export type { EntryType, LedgerEntryInput };
export { validateBalanced };

export interface CommitInput {
  transactionId: string;
  transactionType: 'transfer' | 'fee' | 'yield' | 'offramp' | 'refund' | 'welcome_grant';
  entries: LedgerEntryInput[];
  metadata?: Record<string, unknown>;
  outboxEvent?: {
    topic: string;
    eventType: string;
    payload: Record<string, unknown>;
    correlationId?: string;
    causationId?: string;
  };
}

/**
 * Commit a set of ledger entries atomically + write outbox event.
 *
 * All in a single PostgreSQL transaction. If any step fails (including the
 * balance check or running-balance update), the whole transaction rolls back.
 */
export async function commit(input: CommitInput): Promise<{ entryIds: string[]; outboxId?: string }> {
  // Validate balance invariant at the boundary
  validateBalanced(input.entries);

  return await prisma.$transaction(async (tx) => {
    const entryIds: string[] = [];

    for (const e of input.entries) {
      // Compute running balance for this account+currency
      const last = await tx.ledgerEntry.findFirst({
        where: {
          accountId: e.accountId,
          currency: e.currency,
        },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      });

      const balanceBefore = last?.balanceAfter ?? new Decimal(0);
      const delta = e.entryType === 'DEBIT'
        ? new Decimal(e.amount).neg() // DEBIT reduces user wallet (or it's an outflow from the account)
        : new Decimal(e.amount);       // CREDIT increases

      // For accounting clarity: a "user_wallet" DEBIT means the user is sending money out.
      // This convention is configurable per accountType if needed.
      const balanceAfter = balanceBefore.plus(delta);

      const created = await tx.ledgerEntry.create({
        data: {
          transactionId: input.transactionId,
          transactionType: input.transactionType,
          accountId: e.accountId,
          accountType: e.accountType,
          entryType: e.entryType,
          amount: new Decimal(e.amount),
          currency: e.currency,
          balanceBefore,
          balanceAfter,
          description: e.description,
          metadata: input.metadata as Record<string, never>,
        },
      });

      entryIds.push(created.id);
    }

    let outboxId: string | undefined;
    if (input.outboxEvent) {
      const out = await tx.outboxEvent.create({
        data: {
          topic: input.outboxEvent.topic,
          eventType: input.outboxEvent.eventType,
          payload: input.outboxEvent.payload as Record<string, never>,
          correlationId: input.outboxEvent.correlationId,
          causationId: input.outboxEvent.causationId,
        },
      });
      outboxId = out.id;
    }

    logger.info(
      {
        transactionId: input.transactionId,
        transactionType: input.transactionType,
        entryCount: input.entries.length,
        outboxId,
      },
      'Ledger entries committed',
    );

    return { entryIds, outboxId };
  });
}

/**
 * Read current balance for an account+currency.
 */
export async function getBalance(accountId: string, currency = 'USDC'): Promise<string> {
  const last = await prisma.ledgerEntry.findFirst({
    where: { accountId, currency },
    orderBy: { createdAt: 'desc' },
    select: { balanceAfter: true },
  });
  return (last?.balanceAfter ?? new Decimal(0)).toString();
}

/**
 * Read transaction history for an account.
 */
export async function getTransactions(
  accountId: string,
  options: { currency?: string; limit?: number; cursor?: string } = {},
): Promise<{
  entries: Array<{
    id: string;
    transactionId: string;
    transactionType: string;
    entryType: EntryType;
    amount: string;
    currency: string;
    balanceAfter: string;
    description: string | null;
    createdAt: string;
  }>;
  nextCursor: string | null;
}> {
  const { currency, limit = 50 } = options;

  const items = await prisma.ledgerEntry.findMany({
    where: {
      accountId,
      ...(currency ? { currency } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = items.length > limit;
  const slice = items.slice(0, limit);

  return {
    entries: slice.map((e) => ({
      id: e.id,
      transactionId: e.transactionId,
      transactionType: e.transactionType,
      entryType: e.entryType as EntryType,
      amount: e.amount.toString(),
      currency: e.currency,
      balanceAfter: e.balanceAfter.toString(),
      description: e.description,
      createdAt: e.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  };
}
