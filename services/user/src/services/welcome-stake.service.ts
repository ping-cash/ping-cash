/**
 * Welcome stake mechanics per ADR 0010.
 *
 * On first verified outbound transfer ≥ $10:
 *   - Grant 1,200 Ping Points
 *   - 200 PP unlocked (spendable on fees)
 *   - 1,000 PP locked, unlocks via 5 milestones OR 2y backstop
 *   - Total counts for tier from day 1
 */
// eslint-disable-next-line import/order
import { Decimal } from '.prisma/user-client/runtime/library';

import { UserErrors } from '../utils/errors';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

import { computeTier } from './tier.service';

const WELCOME_STAKE_TOTAL = 1200;
const WELCOME_STAKE_UNLOCKED = 200;
const WELCOME_STAKE_LOCKED = 1000;
const MILESTONE_UNLOCK_AMOUNT = 200;
const BACKSTOP_DURATION_DAYS = 730; // 2 years

const MILESTONES = [
  'refer_3_active',
  'complete_50_sends',
  'active_6mo',
  'active_12mo',
  'silver_organic',
] as const;

export type Milestone = (typeof MILESTONES)[number];

/**
 * Grant welcome stake to a user on first verified outbound transfer.
 * Idempotent — silently no-op if already granted.
 */
export async function grant(userId: string, transferId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw UserErrors.NotFound();

  if (user.welcomeStakeGrantedAt) {
    logger.info({ userId }, 'Welcome stake already granted — skipping');
    return;
  }

  const now = new Date();
  const backstopAt = new Date(now.getTime() + BACKSTOP_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    // Update user balances + welcome timestamps
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        pingPointsFreeBalance: new Decimal(WELCOME_STAKE_UNLOCKED),
        pingPointsWelcomeLocked: new Decimal(WELCOME_STAKE_LOCKED),
        pingPointsWelcomeUnlocked: new Decimal(WELCOME_STAKE_UNLOCKED),
        welcomeStakeGrantedAt: now,
        welcomeStakeBackstopAt: backstopAt,
      },
    });

    const newTier = computeTier(
      updated.pingPointsFreeBalance,
      updated.pingPointsWelcomeLocked,
      updated.pingPointsWelcomeUnlocked,
    );

    await tx.user.update({
      where: { id: userId },
      data: { tier: newTier },
    });

    // Append ledger entry
    await tx.pingPointsLedger.create({
      data: {
        userId,
        changeAmount: new Decimal(WELCOME_STAKE_TOTAL),
        newFreeBalance: updated.pingPointsFreeBalance,
        newWelcomeLocked: updated.pingPointsWelcomeLocked,
        newWelcomeUnlocked: updated.pingPointsWelcomeUnlocked,
        reasonCode: 'welcome_grant',
        tierAtTime: newTier,
        pingPointsBalanceAtTime: new Decimal(WELCOME_STAKE_TOTAL),
        relatedEntityType: 'transfer',
        relatedEntityId: transferId,
        metadata: {
          unlocked: WELCOME_STAKE_UNLOCKED,
          locked: WELCOME_STAKE_LOCKED,
          backstopAt: backstopAt.toISOString(),
        },
      },
    });

    // Create the 5 milestone records (all not-yet-achieved)
    for (const milestone of MILESTONES) {
      await tx.welcomeMilestone.create({
        data: {
          userId,
          milestone,
          progressData: { current: 0 },
        },
      });
    }
  });

  logger.info(
    { userId, transferId, total: WELCOME_STAKE_TOTAL, tier: 'silver' },
    'Welcome stake granted',
  );
}

/**
 * Unlock 200 PP from the locked welcome reserve when a milestone is achieved.
 * Called by gamification-service when it detects milestone trigger.
 */
export async function unlockMilestone(userId: string, milestone: Milestone): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw UserErrors.NotFound();

  const milestoneRecord = await prisma.welcomeMilestone.findUnique({
    where: { userId_milestone: { userId, milestone } },
  });

  if (!milestoneRecord) {
    throw UserErrors.NotFound();
  }

  if (milestoneRecord.unlockedAt) {
    logger.info({ userId, milestone }, 'Milestone already unlocked — skipping');
    return;
  }

  const currentLocked = Number(user.pingPointsWelcomeLocked);
  if (currentLocked < MILESTONE_UNLOCK_AMOUNT) {
    logger.warn(
      { userId, currentLocked, requested: MILESTONE_UNLOCK_AMOUNT },
      'Insufficient locked balance for milestone unlock',
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    const newFree = Number(user.pingPointsFreeBalance) + MILESTONE_UNLOCK_AMOUNT;
    const newLocked = currentLocked - MILESTONE_UNLOCK_AMOUNT;

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        pingPointsFreeBalance: new Decimal(newFree),
        pingPointsWelcomeLocked: new Decimal(newLocked),
      },
    });

    const newTier = computeTier(
      updated.pingPointsFreeBalance,
      updated.pingPointsWelcomeLocked,
      updated.pingPointsWelcomeUnlocked,
    );

    if (newTier !== updated.tier) {
      await tx.user.update({ where: { id: userId }, data: { tier: newTier } });
    }

    await tx.welcomeMilestone.update({
      where: { userId_milestone: { userId, milestone } },
      data: {
        achievedAt: milestoneRecord.achievedAt ?? new Date(),
        unlockedAt: new Date(),
      },
    });

    await tx.pingPointsLedger.create({
      data: {
        userId,
        changeAmount: new Decimal(0), // Net zero — moves from locked → free
        newFreeBalance: new Decimal(newFree),
        newWelcomeLocked: new Decimal(newLocked),
        newWelcomeUnlocked: updated.pingPointsWelcomeUnlocked,
        reasonCode: 'welcome_milestone_unlock',
        tierAtTime: newTier,
        pingPointsBalanceAtTime: new Decimal(
          Number(updated.pingPointsFreeBalance) +
            Number(updated.pingPointsWelcomeLocked) +
            Number(updated.pingPointsWelcomeUnlocked),
        ),
        metadata: { milestone, unlocked_amount: MILESTONE_UNLOCK_AMOUNT },
      },
    });
  });

  logger.info(
    { userId, milestone, unlocked: MILESTONE_UNLOCK_AMOUNT },
    'Milestone unlocked',
  );
}

/**
 * Backstop unlock — called by daily cron after 2y from grant for users
 * who haven't achieved any milestones. Unlocks ALL remaining locked balance.
 */
export async function backstopUnlock(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw UserErrors.NotFound();

  if (!user.welcomeStakeBackstopAt || user.welcomeStakeBackstopAt > new Date()) {
    logger.info({ userId }, 'Backstop time not reached yet — skipping');
    return;
  }

  const remaining = Number(user.pingPointsWelcomeLocked);
  if (remaining <= 0) {
    logger.info({ userId }, 'No locked balance remaining — skipping backstop');
    return;
  }

  await prisma.$transaction(async (tx) => {
    const newFree = Number(user.pingPointsFreeBalance) + remaining;

    await tx.user.update({
      where: { id: userId },
      data: {
        pingPointsFreeBalance: new Decimal(newFree),
        pingPointsWelcomeLocked: new Decimal(0),
      },
    });

    await tx.pingPointsLedger.create({
      data: {
        userId,
        changeAmount: new Decimal(0),
        newFreeBalance: new Decimal(newFree),
        newWelcomeLocked: new Decimal(0),
        newWelcomeUnlocked: user.pingPointsWelcomeUnlocked,
        reasonCode: 'welcome_backstop_unlock',
        tierAtTime: user.tier,
        pingPointsBalanceAtTime: new Decimal(
          newFree + Number(user.pingPointsWelcomeUnlocked),
        ),
        metadata: { backstop_at: user.welcomeStakeBackstopAt?.toISOString() },
      },
    });
  });

  logger.info(
    { userId, unlocked: remaining },
    'Backstop unlock executed (2-year safety net)',
  );
}
