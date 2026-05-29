/**
 * Unit tests for milestone.service.ts — stub-mode shape + milestone
 * definitions (#65).
 */
import { describe, it, expect } from 'vitest';

import {
  dailyCronCheck,
  getMilestoneDefinitions,
  getProgress,
  onReferralActivity,
  onTransferCompleted,
} from './milestone.service';

describe('milestone definitions', () => {
  it('exposes all 5 ADR-0010 milestones', () => {
    const defs = getMilestoneDefinitions();
    expect(defs).toHaveProperty('refer_3_active');
    expect(defs).toHaveProperty('complete_50_sends');
    expect(defs).toHaveProperty('active_6mo');
    expect(defs).toHaveProperty('active_12mo');
    expect(defs).toHaveProperty('silver_organic');
  });

  it('refer_3_active target is 3', () => {
    expect(getMilestoneDefinitions().refer_3_active.target).toBe(3);
  });

  it('complete_50_sends target is 50', () => {
    expect(getMilestoneDefinitions().complete_50_sends.target).toBe(50);
  });
});

describe('getProgress (stub)', () => {
  it('returns progress entries for every milestone, all at 0', async () => {
    const p = await getProgress('usr_test1');
    expect(p.length).toBe(5);
    for (const m of p) {
      expect(m.userId).toBe('usr_test1');
      expect(m.currentValue).toBe(0);
      expect(m.achieved).toBe(false);
      expect(m.targetValue).toBeGreaterThan(0);
    }
  });
});

describe('event handlers (stub)', () => {
  it('onTransferCompleted is non-throwing in stub mode', async () => {
    await expect(
      onTransferCompleted({ userId: 'usr_t', transferId: 'tx_1' })
    ).resolves.toBeDefined();
  });

  it('onReferralActivity is non-throwing in stub mode', async () => {
    await expect(
      onReferralActivity({ userId: 'usr_t', referredUserId: 'usr_t2' })
    ).resolves.toBeDefined();
  });

  it('dailyCronCheck returns a summary shape', async () => {
    const r = await dailyCronCheck();
    expect(r).toBeDefined();
    expect(typeof r).toBe('object');
  });
});
