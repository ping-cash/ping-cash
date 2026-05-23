/**
 * Welcome-stake milestone tracker.
 *
 * Per ADR 0010 — 5 milestones, each unlocks 200 PING:
 *   1. refer_3_active: 3 referrals, each completing ≥ 3 outbound transfers in 30 days
 *   2. complete_50_sends: user completes 50 outbound transfers
 *   3. active_6mo: 6 months of monthly activity (≥ 1 transfer per month)
 *   4. active_12mo: 12 months of monthly activity
 *   5. silver_organic: user holds ≥ 1,000 PING outside their welcome stake
 *
 * This service:
 *   - Consumes events from transfer.events / user.events Kafka topics
 *   - Updates per-user milestone progress counters
 *   - On threshold cross, calls user-service to unlock 200 PING from locked → free
 */
import { logger } from '../utils/logger';

export type MilestoneId =
  | 'refer_3_active'
  | 'complete_50_sends'
  | 'active_6mo'
  | 'active_12mo'
  | 'silver_organic';

const MILESTONE_UNLOCK_AMOUNT = 200;

const MILESTONE_DEFINITIONS: Record<
  MilestoneId,
  { target: number; description: string }
> = {
  refer_3_active: {
    target: 3,
    description: '3 referred users each with 3+ successful transfers in 30d',
  },
  complete_50_sends: {
    target: 50,
    description: '50 successful outbound transfers',
  },
  active_6mo: { target: 6, description: '6 months of monthly activity' },
  active_12mo: { target: 12, description: '12 months of monthly activity' },
  silver_organic: {
    target: 1000,
    description: 'Hold 1,000+ $PING outside welcome stake',
  },
};

export interface MilestoneProgress {
  userId: string;
  milestone: MilestoneId;
  currentValue: number;
  targetValue: number;
  achieved: boolean;
  unlocked: boolean;
  unlockedAmount: number;
}

/**
 * Get current milestone progress for a user.
 * In production, this would query the user-service via API.
 * Stub version for now — returns synthetic progress.
 */
export async function getProgress(
  userId: string
): Promise<MilestoneProgress[]> {
  logger.info({ userId }, '[STUB] Reading milestone progress');
  return Object.entries(MILESTONE_DEFINITIONS).map(([id, def]) => ({
    userId,
    milestone: id as MilestoneId,
    currentValue: 0,
    targetValue: def.target,
    achieved: false,
    unlocked: false,
    unlockedAmount: 0,
  }));
}

/**
 * Process a transfer-completion event from the transfer.events topic.
 * Increments relevant counters; triggers unlock when thresholds cross.
 */
export async function onTransferCompleted(input: {
  userId: string;
  transferId: string;
  amount: string;
  timestamp: number;
}): Promise<{ progressed: MilestoneId[]; unlocked: MilestoneId[] }> {
  logger.info(
    { userId: input.userId, transferId: input.transferId },
    'Processing transfer event'
  );

  // Phase 1 stub: in production, this calls user-service with updates.
  // For now, log the event flow.
  const progressed: MilestoneId[] = ['complete_50_sends'];
  const unlocked: MilestoneId[] = [];

  // Real implementation would:
  //   1. Increment complete_50_sends counter
  //   2. Update active_6mo / active_12mo monthly flags
  //   3. If counter == target, call user-service /internal/welcome-milestone-unlock

  return { progressed, unlocked };
}

/**
 * Process a referral-activity event.
 * Checks whether a referred user has now completed 3+ transfers within 30 days,
 * which counts as "active" for the referrer's refer_3_active milestone.
 */
export async function onReferralActivity(input: {
  referrerId: string;
  refereeId: string;
  refereeTransferCount: number;
}): Promise<{ progressed: boolean; unlocked: boolean }> {
  logger.info(input, 'Processing referral activity event');
  // Real implementation: increment referrer's refer_3_active count if referee is now active.
  return { progressed: input.refereeTransferCount >= 3, unlocked: false };
}

/**
 * Daily cron: check active_6mo / active_12mo / backstop unlock for all users.
 */
export async function dailyCronCheck(): Promise<{
  usersProcessed: number;
  unlocksTriggered: number;
}> {
  logger.info('[STUB] Daily cron — milestone backstop check');
  return { usersProcessed: 0, unlocksTriggered: 0 };
}

export function getMilestoneDefinitions() {
  return MILESTONE_DEFINITIONS;
}

export { MILESTONE_UNLOCK_AMOUNT };
