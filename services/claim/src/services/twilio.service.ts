/**
 * Twilio Verify integration for claim-side OTP.
 *
 * Separate from auth-service's Twilio integration:
 * - auth-service uses Twilio for sender phone verification
 * - claim-service uses Twilio for recipient phone verification (claim flow)
 *
 * Both share the same Twilio account but use the same Verify SID.
 */
import { loadConfig } from '@ping/config';
import twilio from 'twilio';

import { ClaimErrors } from '../utils/errors';
import { logger } from '../utils/logger';

const config = loadConfig();

let _client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (_client) return _client;
  const accountSid = config.TWILIO_ACCOUNT_SID;
  const authToken = config.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    logger.warn('Twilio credentials not set — claim OTP in stub mode');
    return null;
  }
  _client = twilio(accountSid, authToken);
  return _client;
}

export async function sendClaimOtp(
  phone: string
): Promise<{ sid: string; status: string }> {
  const client = getClient();
  const verifyServiceSid = config.TWILIO_VERIFY_SID;

  if (!client || !verifyServiceSid) {
    logger.info(
      { phone },
      '[STUB MODE] Would send claim OTP via Twilio Verify'
    );
    return { sid: `stub_${Date.now()}`, status: 'pending' };
  }

  try {
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: phone, channel: 'sms' });
    return { sid: verification.sid, status: verification.status };
  } catch (err) {
    logger.error(
      { err, phone: maskPhone(phone) },
      'Twilio sendClaimOtp failed'
    );
    throw ClaimErrors.TwilioFailure({ message: (err as Error).message });
  }
}

export async function verifyClaimOtp(
  phone: string,
  code: string
): Promise<boolean> {
  const client = getClient();
  const verifyServiceSid = config.TWILIO_VERIFY_SID;

  if (!client || !verifyServiceSid) {
    logger.info(
      { phone, code },
      '[STUB MODE] Would verify claim OTP via Twilio Verify'
    );
    return code === '123456';
  }

  try {
    const check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phone, code });
    return check.status === 'approved';
  } catch (err) {
    logger.error(
      { err, phone: maskPhone(phone) },
      'Twilio verifyClaimOtp failed'
    );
    throw ClaimErrors.TwilioFailure({ message: (err as Error).message });
  }
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return phone.slice(0, 4) + '****' + phone.slice(-2);
}
