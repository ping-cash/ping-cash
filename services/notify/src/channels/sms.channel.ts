/**
 * SMS channel via Twilio Programmable Messaging.
 * (Distinct from Twilio Verify — Verify is OTP-only; this is general SMS.)
 */
import { loadConfig } from '@ping/config';
import twilio from 'twilio';

import { logger } from '../utils/logger';

import type { ChannelResult } from './whatsapp.channel';

const config = loadConfig();

let _client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (_client) return _client;
  if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) return null;
  _client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
  return _client;
}

export interface SmsSendInput {
  to: string; // E.164
  body: string;
}

export async function sendSms(input: SmsSendInput): Promise<ChannelResult> {
  const client = getClient();
  const fromNumber = config.TWILIO_FROM_NUMBER;

  if (!client || !fromNumber) {
    logger.info({ to: maskPhone(input.to) }, '[STUB MODE] Would send SMS');
    return {
      channel: 'sms',
      delivered: true,
      providerMessageId: `sms_stub_${Date.now()}`,
    };
  }

  try {
    const result = await client.messages.create({
      to: input.to,
      from: fromNumber,
      body: input.body,
    });
    return {
      channel: 'sms',
      delivered: result.status === 'queued' || result.status === 'sent' || result.status === 'delivered',
      providerMessageId: result.sid,
    };
  } catch (err) {
    logger.error({ err, to: maskPhone(input.to) }, 'SMS send error');
    return {
      channel: 'sms',
      delivered: false,
      error: (err as Error).message,
    };
  }
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return phone.slice(0, 4) + '****' + phone.slice(-2);
}
