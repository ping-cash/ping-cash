/**
 * Unit tests for privy.service.ts — the OTP_TEST_PHONES bypass that
 * keeps corridor smoke + Maestro walks off the Privy quota (#74 / #81).
 */
import { describe, it, expect } from 'vitest';

import { bindPhoneToWallet } from './privy.service';

describe('bindPhoneToWallet', () => {
  it('returns a deterministic wallet — same phone → same wallet', async () => {
    const r1 = await bindPhoneToWallet('+447700900789');
    const r2 = await bindPhoneToWallet('+447700900789');

    expect(r1.walletAddress).toBe(r2.walletAddress);
    expect(r1.privyUserId).toBe(r2.privyUserId);
    expect(r1.isNewUser).toBe(true);
  });

  it('two different test phones get two different deterministic wallets', async () => {
    const a = await bindPhoneToWallet('+447700900789');
    const b = await bindPhoneToWallet('+447700900790');
    expect(a.walletAddress).not.toBe(b.walletAddress);
    expect(a.privyUserId).not.toBe(b.privyUserId);
  });

  it('returns isNewUser:true (no real Privy account exists in tests)', async () => {
    const r = await bindPhoneToWallet('+447700900100');
    expect(r.isNewUser).toBe(true);
    expect(typeof r.walletAddress).toBe('string');
    expect(r.walletAddress.length).toBeGreaterThan(0);
  });

  // Production phones DO require a Privy SDK client; with no client
  // configured the function falls into stub mode and returns a
  // similar deterministic stub. That overlap is tested implicitly
  // via the test phones above — both paths exercise the same code.
});
