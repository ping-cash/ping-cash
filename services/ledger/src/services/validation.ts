/**
 * Pure boundary validation — no DB / Kafka / Prisma imports.
 *
 * Uses string + scaled bigint arithmetic to avoid floating-point drift.
 */
import { LedgerErrors } from '../utils/errors';

export type EntryType = 'DEBIT' | 'CREDIT';

export interface LedgerEntryInput {
  accountId: string;
  accountType:
    | 'user_wallet'
    | 'platform_fee'
    | 'platform_markup'
    | 'provider_cost'
    | 'yield_pool'
    | 'foundation_reserve';
  entryType: EntryType;
  amount: string;
  currency: string;
  description?: string;
}

/**
 * Convert decimal string to bigint (scaled to 8 decimal places).
 * Avoids floating-point arithmetic for currency math.
 */
function toScaledBigInt(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const padded = (fraction + '00000000').slice(0, 8);
  return BigInt(whole) * 100000000n + BigInt(padded);
}

/**
 * Validate that entries balance (debits == credits per currency).
 */
export function validateBalanced(entries: LedgerEntryInput[]): void {
  const totals: Record<string, bigint> = {};
  for (const e of entries) {
    const key = e.currency;
    const scaled = toScaledBigInt(e.amount);
    const signed = e.entryType === 'DEBIT' ? scaled : -scaled;
    totals[key] = (totals[key] ?? 0n) + signed;
  }
  for (const [currency, sum] of Object.entries(totals)) {
    if (sum !== 0n) {
      throw LedgerErrors.ImbalancedTransaction({
        currency,
        unbalanced_amount: sum.toString(),
      });
    }
  }
}
