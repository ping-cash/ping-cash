import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { loadConfig } from '@ping/config';
import { logger } from '../utils/logger';
import { sendOtp, verifyOtp } from './twilio.service';
import { bindPhoneToWallet } from './privy.service';
import {
  storeOtpSession,
  readOtpSession,
  incrementOtpAttempts,
  deleteOtpSession,
  storeRefreshToken,
  readRefreshToken,
  revokeRefreshToken,
  checkInitRateLimit,
} from '../utils/redis';
import { AuthErrors } from '../utils/errors';

const config = loadConfig();
const MAX_OTP_ATTEMPTS = 5;

export interface InitResult {
  sessionId: string;
  expiresIn: number;
  channel: 'sms';
}

export interface VerifyResult {
  user: {
    id: string;
    phone: string;
    phoneHash: string;
    walletAddress: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  isNewUser: boolean;
}

export interface RefreshResult {
  accessToken: string;
  expiresIn: number;
}

/**
 * Hash a phone number for indexing without storing PII in cleartext.
 */
function hashPhone(phone: string): string {
  return createHash('sha256').update(phone).digest('hex');
}

/**
 * Mask a phone for display (e.g., for response payloads).
 */
function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return phone.slice(0, -7) + ' *** *** ' + phone.slice(-4);
}

/**
 * Initialize phone verification:
 *   1. Rate-limit check (5 per IP per 10 min)
 *   2. Validate phone format (E.164)
 *   3. Send OTP via Twilio
 *   4. Store session in Redis (10-min TTL)
 *   5. Return session ID
 */
export async function init(phone: string, ip: string): Promise<InitResult> {
  // Rate-limit check
  const rateCheck = await checkInitRateLimit(ip);
  if (!rateCheck.allowed) {
    logger.warn({ ip, resetIn: rateCheck.resetIn }, 'Init rate limit exceeded');
    throw AuthErrors.RateLimited();
  }

  // Phone format validation (E.164)
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
    throw AuthErrors.InvalidPhone();
  }

  // Send OTP
  const { sid: twilioSid } = await sendOtp(phone);

  // Create session
  const sessionId = `sess_${randomUUID()}`;
  await storeOtpSession(sessionId, {
    phone,
    phoneHash: hashPhone(phone),
    twilioSid,
    attempts: 0,
    createdAt: Date.now(),
  });

  logger.info({ sessionId, phoneMasked: maskPhone(phone) }, 'OTP session created');

  return {
    sessionId,
    expiresIn: 600,
    channel: 'sms',
  };
}

/**
 * Verify OTP + create/bind Privy wallet + mint JWT pair.
 */
export async function verify(
  sessionId: string,
  code: string,
  app: { jwt: { sign: (payload: Record<string, unknown>, opts?: Record<string, unknown>) => string } },
): Promise<VerifyResult> {
  // Look up session
  const session = await readOtpSession(sessionId);
  if (!session) {
    throw AuthErrors.SessionNotFound();
  }

  // Check attempts
  if (session.attempts >= MAX_OTP_ATTEMPTS) {
    throw AuthErrors.MaxAttempts();
  }

  // Validate OTP format
  if (!/^\d{6}$/.test(code)) {
    await incrementOtpAttempts(sessionId);
    throw AuthErrors.InvalidOtp();
  }

  // Verify with Twilio
  const isValid = await verifyOtp(session.phone, code);
  if (!isValid) {
    const attempts = await incrementOtpAttempts(sessionId);
    if (attempts >= MAX_OTP_ATTEMPTS) {
      throw AuthErrors.MaxAttempts();
    }
    throw AuthErrors.InvalidOtp();
  }

  // OTP valid — bind to Privy wallet
  const privyResult = await bindPhoneToWallet(session.phone);

  // Generate user ID (Privy ID is canonical; we store both)
  const userId = `usr_${createHash('sha256').update(privyResult.privyUserId).digest('hex').slice(0, 16)}`;

  // Mint access + refresh tokens
  const jti = randomBytes(16).toString('hex');
  const accessToken = app.jwt.sign({
    sub: userId,
    phone: session.phoneHash,
    privyId: privyResult.privyUserId,
    wallet: privyResult.walletAddress,
  });

  const refreshToken = app.jwt.sign(
    {
      sub: userId,
      jti,
      type: 'refresh',
    },
    { expiresIn: config.JWT_REFRESH_TOKEN_TTL ?? '7d' },
  );

  // Store refresh token jti in Redis (for revocation tracking)
  await storeRefreshToken(jti, {
    userId,
    phoneHash: session.phoneHash,
    issuedAt: Date.now(),
  });

  // Clean up OTP session
  await deleteOtpSession(sessionId);

  logger.info(
    { userId, walletAddress: privyResult.walletAddress, isNewUser: privyResult.isNewUser },
    'User authenticated',
  );

  return {
    user: {
      id: userId,
      phone: maskPhone(session.phone),
      phoneHash: session.phoneHash,
      walletAddress: privyResult.walletAddress,
    },
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: 900,
    },
    isNewUser: privyResult.isNewUser,
  };
}

/**
 * Refresh a JWT access token using a valid refresh token.
 * Implements refresh-token rotation: old refresh token is revoked,
 * new refresh + access tokens are issued.
 */
export async function refresh(
  refreshTokenPayload: { sub: string; jti: string },
  app: { jwt: { sign: (payload: Record<string, unknown>, opts?: Record<string, unknown>) => string } },
): Promise<RefreshResult & { refreshToken: string }> {
  // Check the refresh token jti is still valid (not revoked)
  const record = await readRefreshToken(refreshTokenPayload.jti);
  if (!record || record.userId !== refreshTokenPayload.sub) {
    throw AuthErrors.InvalidRefreshToken();
  }

  // Revoke the old refresh token
  await revokeRefreshToken(refreshTokenPayload.jti);

  // Issue new pair
  const newJti = randomBytes(16).toString('hex');
  const accessToken = app.jwt.sign({
    sub: record.userId,
    phone: record.phoneHash,
  });

  const newRefreshToken = app.jwt.sign(
    {
      sub: record.userId,
      jti: newJti,
      type: 'refresh',
    },
    { expiresIn: config.JWT_REFRESH_TOKEN_TTL ?? '7d' },
  );

  await storeRefreshToken(newJti, {
    userId: record.userId,
    phoneHash: record.phoneHash,
    issuedAt: Date.now(),
  });

  logger.info({ userId: record.userId }, 'Tokens refreshed');

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 900,
  };
}

/**
 * Logout: revoke the refresh token.
 */
export async function logout(jti: string): Promise<void> {
  await revokeRefreshToken(jti);
  logger.info({ jti }, 'User logged out');
}
