/**
 * WhatsApp Business API integration.
 *
 * Per ARCHITECTURE.md: WhatsApp is the primary channel for claim notifications
 * + transfer events. SMS is the fallback (cheaper but lower engagement).
 */
import { loadConfig } from '@ping/config';
import { logger } from '../utils/logger';
import { NotifyErrors } from '../utils/errors';

const config = loadConfig();
const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

export interface WhatsAppSendInput {
  to: string; // E.164 phone number (no +)
  body: string;
}

export interface ChannelResult {
  channel: 'whatsapp' | 'sms' | 'push';
  delivered: boolean;
  providerMessageId?: string;
  error?: string;
}

export async function sendWhatsApp(input: WhatsAppSendInput): Promise<ChannelResult> {
  const phoneNumberId = config.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = config.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    logger.info({ to: maskPhone(input.to) }, '[STUB MODE] Would send WhatsApp');
    return {
      channel: 'whatsapp',
      delivered: true,
      providerMessageId: `wa_stub_${Date.now()}`,
    };
  }

  const phone = input.to.replace(/^\+/, '');

  try {
    const response = await fetch(`${GRAPH_API_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: { body: input.body },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      logger.error({ status: response.status, body: errBody }, 'WhatsApp API error');
      return {
        channel: 'whatsapp',
        delivered: false,
        error: `${response.status} ${errBody}`,
      };
    }

    const body = (await response.json()) as { messages: Array<{ id: string }> };
    return {
      channel: 'whatsapp',
      delivered: true,
      providerMessageId: body.messages[0]?.id,
    };
  } catch (err) {
    logger.error({ err, to: maskPhone(input.to) }, 'WhatsApp send error');
    return {
      channel: 'whatsapp',
      delivered: false,
      error: (err as Error).message,
    };
  }
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return '***';
  return phone.slice(0, 4) + '****' + phone.slice(-2);
}
