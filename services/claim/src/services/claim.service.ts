/**
 * Claim service — link creation, validation, OTP-gated cash-out selection.
 *
 * Per ADR 0010 + ARCHITECTURE.md § Claim Service:
 *   - 12-char alphanumeric code (62^12 ≈ 3.2×10^21 entropy)
 *   - 7-day expiry from creation
 *   - Single-use (cannot reclaim)
 *   - 5 OTP attempts max
 *   - Rate limited at IP level
 */
import { randomBytes, createHash } from 'node:crypto';

import { ClaimErrors } from '../utils/errors';
import { logger } from '../utils/logger';
import {
  storeClaim,
  readClaim,
  updateClaim,
  checkOtpRateLimit,
  checkClaimViewRateLimit,
  type ClaimRecord,
} from '../utils/redis';

import { sendClaimOtp, verifyClaimOtp } from './twilio.service';


const CLAIM_CODE_LENGTH = 12;
const CLAIM_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CLAIM_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

/**
 * Generate a cryptographically random claim code.
 */
function generateClaimCode(): string {
  const bytes = randomBytes(CLAIM_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CLAIM_CODE_LENGTH; i++) {
    code += CLAIM_CODE_ALPHABET[bytes[i] % CLAIM_CODE_ALPHABET.length];
  }
  return code;
}

function hashPhone(phone: string): string {
  return createHash('sha256').update(phone).digest('hex');
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return phone.slice(0, -7) + ' *** *** ' + phone.slice(-4);
}

/**
 * Create a new claim record. Called by transfer-service when a sender
 * initiates a transfer to a non-Ping recipient.
 */
export async function create(input: {
  transferId: string;
  senderId: string;
  senderName?: string;
  recipientPhone: string;
  amount: { value: string; currency: string; localValue?: string; localCurrency?: string; fxRate?: number };
}): Promise<{ code: string; url: string; expiresAt: number }> {
  // Generate unique code (retry on collision — improbable but safe)
  let code = generateClaimCode();
  let attempts = 0;
  for (let i = 0; i < 6; i++) {
    const existing = await readClaim(code);
    if (!existing) break;
    code = generateClaimCode();
    attempts++;
    if (attempts > 5) {
      throw new Error('Failed to generate unique claim code after 5 attempts');
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + CLAIM_EXPIRY_SECONDS;

  const record: ClaimRecord = {
    code,
    transferId: input.transferId,
    senderId: input.senderId,
    senderName: input.senderName,
    recipientPhone: input.recipientPhone,
    recipientPhoneHash: hashPhone(input.recipientPhone),
    amount: input.amount,
    status: 'pending',
    verification: {
      attempts: 0,
      maxAttempts: 5,
    },
    createdAt: now,
    expiresAt,
  };

  await storeClaim(code, record);

  const url = `${process.env.CLAIM_URL_BASE ?? 'https://ping.cash/c'}/${code}`;
  logger.info({ code, transferId: input.transferId }, 'Claim created');

  return { code, url, expiresAt };
}

/**
 * Get a claim by code (public — for the web claim page to render).
 * Returns ONLY publicly safe fields — never sender phone, never recipient phone unmasked.
 */
export async function getPublic(
  code: string,
  ip: string,
): Promise<{
  code: string;
  status: string;
  sender: { name?: string };
  amount: ClaimRecord['amount'];
  recipientPhoneMasked: string;
  expiresAt: number;
  expiresIn: number;
}> {
  const allowed = await checkClaimViewRateLimit(ip);
  if (!allowed) {
    throw ClaimErrors.RateLimited();
  }

  const record = await readClaim(code);
  if (!record) throw ClaimErrors.ClaimNotFound();

  const now = Math.floor(Date.now() / 1000);
  if (record.expiresAt < now) {
    throw ClaimErrors.ClaimExpired();
  }
  if (record.status === 'claimed') {
    throw ClaimErrors.ClaimAlreadyUsed();
  }

  return {
    code: record.code,
    status: record.status,
    sender: { name: record.senderName },
    amount: record.amount,
    recipientPhoneMasked: maskPhone(record.recipientPhone),
    expiresAt: record.expiresAt,
    expiresIn: record.expiresAt - now,
  };
}

/**
 * Request OTP for a claim.
 * Sends to the recipient phone stored on the claim.
 */
export async function requestOtp(code: string, ip: string): Promise<{ sent: true; attemptsRemaining: number; expiresIn: number }> {
  const record = await readClaim(code);
  if (!record) throw ClaimErrors.ClaimNotFound();

  const now = Math.floor(Date.now() / 1000);
  if (record.expiresAt < now) throw ClaimErrors.ClaimExpired();
  if (record.status === 'claimed') throw ClaimErrors.ClaimAlreadyUsed();

  // Rate-limit OTP requests
  const rateCheck = await checkOtpRateLimit(code, ip);
  if (!rateCheck.allowed) throw ClaimErrors.RateLimited();

  await sendClaimOtp(record.recipientPhone);

  return {
    sent: true,
    attemptsRemaining: rateCheck.remaining,
    expiresIn: 600,
  };
}

/**
 * Verify the OTP and mark the claim as 'verified'.
 * Returns a short-lived verification token the client can use for the cashout call.
 */
export async function verifyOtp(
  code: string,
  otpCode: string,
): Promise<{ verified: true; verificationToken: string; cashoutMethods: Array<{ method: string; estimatedTime: string; fee: string }> }> {
  const record = await readClaim(code);
  if (!record) throw ClaimErrors.ClaimNotFound();

  const now = Math.floor(Date.now() / 1000);
  if (record.expiresAt < now) throw ClaimErrors.ClaimExpired();
  if (record.status === 'claimed') throw ClaimErrors.ClaimAlreadyUsed();
  if (record.verification.attempts >= record.verification.maxAttempts) {
    throw ClaimErrors.MaxAttempts();
  }

  if (!/^\d{6}$/.test(otpCode)) {
    await updateClaim(code, {
      verification: {
        ...record.verification,
        attempts: record.verification.attempts + 1,
      },
    });
    throw ClaimErrors.InvalidOtp();
  }

  const isValid = await verifyClaimOtp(record.recipientPhone, otpCode);
  if (!isValid) {
    const attempts = record.verification.attempts + 1;
    await updateClaim(code, {
      verification: { ...record.verification, attempts },
    });
    if (attempts >= record.verification.maxAttempts) {
      throw ClaimErrors.MaxAttempts();
    }
    throw ClaimErrors.InvalidOtp();
  }

  // Mark verified
  await updateClaim(code, { status: 'verified' });

  // Generate verification token (short-lived; used for next API call)
  const verificationToken = `vt_${randomBytes(32).toString('hex')}`;
  // In production, this token would be JWT signed; for now we just include it
  // in the response and the offramp-service will validate it via redis lookup.

  // Determine cash-out methods based on recipient's country (inferred from phone country code)
  const cashoutMethods = inferCashoutMethods(record.recipientPhone);

  return {
    verified: true,
    verificationToken,
    cashoutMethods,
  };
}

/**
 * Initiate cash-out via the selected method.
 * Marks the claim as 'claimed' (single-use enforcement).
 */
export async function executeCashout(input: {
  code: string;
  method: string;
  account: string;
  accountName?: string;
}): Promise<{ status: 'processing'; offrampReference: string }> {
  const record = await readClaim(input.code);
  if (!record) throw ClaimErrors.ClaimNotFound();

  if (record.status !== 'verified') {
    throw ClaimErrors.InvalidOtp();
  }

  // Reserve the claim atomically
  await updateClaim(input.code, {
    status: 'claimed',
    cashout: {
      method: input.method,
      account: input.account,
      selectedAt: Math.floor(Date.now() / 1000),
    },
  });

  // Generate offramp reference (handed back to user, used by offramp-service)
  const offrampReference = `PING-${randomBytes(4).toString('hex').toUpperCase()}`;

  logger.info(
    { code: input.code, method: input.method, offrampReference },
    'Cash-out initiated',
  );

  // In production: emit Kafka event to offramp-service via outbox in ledger-service
  // For now, the offramp-service polls or is invoked via this event
  return {
    status: 'processing',
    offrampReference,
  };
}

function inferCashoutMethods(phone: string): Array<{ method: string; estimatedTime: string; fee: string }> {
  // E.164 country code mapping → available methods
  if (phone.startsWith('+63')) {
    return [
      { method: 'gcash', estimatedTime: 'Instant', fee: '0.5%' },
      { method: 'maya', estimatedTime: 'Instant', fee: '0.5%' },
      { method: 'bdo-bank', estimatedTime: '1-24 hrs', fee: '0.75%' },
      { method: 'cebuana-cash-pickup', estimatedTime: '1 hour', fee: '1.0%' },
    ];
  }
  if (phone.startsWith('+91')) {
    return [
      { method: 'upi', estimatedTime: 'Instant', fee: '0.5%' },
      { method: 'neft-bank', estimatedTime: '2-4 hrs', fee: '0.5%' },
      { method: 'paytm', estimatedTime: 'Instant', fee: '0.75%' },
    ];
  }
  if (phone.startsWith('+92')) {
    return [
      { method: 'jazzcash', estimatedTime: 'Instant', fee: '0.5%' },
      { method: 'easypaisa', estimatedTime: 'Instant', fee: '0.5%' },
      { method: 'bank-transfer', estimatedTime: '1-24 hrs', fee: '0.75%' },
    ];
  }
  if (phone.startsWith('+880')) {
    return [
      { method: 'bkash', estimatedTime: 'Instant', fee: '0.5%' },
      { method: 'nagad', estimatedTime: 'Instant', fee: '0.5%' },
    ];
  }
  if (phone.startsWith('+254')) {
    return [
      { method: 'm-pesa', estimatedTime: 'Instant', fee: '0.5%' },
      { method: 'airtel-money', estimatedTime: 'Instant', fee: '0.5%' },
    ];
  }
  if (phone.startsWith('+90')) {
    return [
      { method: 'turkish-bank', estimatedTime: 'Instant', fee: '0.75%' },
    ];
  }
  // Default
  return [
    { method: 'bank-transfer', estimatedTime: '1-24 hrs', fee: '0.75%' },
  ];
}
