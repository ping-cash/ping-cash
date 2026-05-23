import { loadConfig } from '@ping/config';
import twilio from 'twilio';

import { AuthErrors } from '../utils/errors';
import { logger } from '../utils/logger';

const config = loadConfig();

// Twilio Verify service.
// In production, all credentials sourced from OpenBao via External Secrets Operator.
let _client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (_client) return _client;
  const accountSid = config.TWILIO_ACCOUNT_SID;
  const authToken = config.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    logger.warn('Twilio credentials not set — using stub mode');
    return null;
  }
  _client = twilio(accountSid, authToken);
  return _client;
}

/**
 * Send a 6-digit OTP to the phone via Twilio Verify.
 * Returns the Twilio Verification SID for tracking.
 *
 * In stub mode (no credentials), returns a fake SID and logs the would-be call.
 */
export async function sendOtp(phone: string): Promise<{ sid: string; status: string }> {
  const client = getClient();
  const verifyServiceSid = config.TWILIO_VERIFY_SID;

  if (!client || !verifyServiceSid) {
    logger.info({ phone }, '[STUB MODE] Would send OTP via Twilio Verify');
    return { sid: `stub_${Date.now()}`, status: 'pending' };
  }

  try {
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: phone, channel: 'sms' });

    logger.info(
      { sid: verification.sid, status: verification.status, phone: maskPhone(phone) },
      'OTP sent via Twilio Verify',
    );

    return { sid: verification.sid, status: verification.status };
  } catch (err) {
    logger.error({ err, phone: maskPhone(phone) }, 'Twilio sendOtp failed');
    throw AuthErrors.TwilioFailure({ message: (err as Error).message });
  }
}

/**
 * Verify the OTP code submitted by the user.
 * Returns true if approved, false otherwise.
 *
 * In stub mode, accepts code "123456" as valid (dev only).
 */
export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const client = getClient();
  const verifyServiceSid = config.TWILIO_VERIFY_SID;

  if (!client || !verifyServiceSid) {
    logger.info({ phone, code }, '[STUB MODE] Would verify OTP via Twilio Verify');
    return code === '123456';
  }

  try {
    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phone, code });

    logger.info(
      { status: verificationCheck.status, phone: maskPhone(phone) },
      'OTP verification result',
    );

    return verificationCheck.status === 'approved';
  } catch (err) {
    logger.error({ err, phone: maskPhone(phone) }, 'Twilio verifyOtp failed');
    throw AuthErrors.TwilioFailure({ message: (err as Error).message });
  }
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return phone.slice(0, 4) + '****' + phone.slice(-2);
}
