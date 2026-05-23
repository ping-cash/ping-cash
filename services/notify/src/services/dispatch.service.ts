/**
 * Multi-channel dispatch with fallback.
 *
 * Per ARCHITECTURE.md § Notification Service Channels:
 *   WhatsApp → SMS fallback for transactional events.
 *   Push parallel to WhatsApp/SMS for app users.
 *
 * Per PRINCIPLES § 4 (no defensive code for impossible scenarios):
 *   We DO retry on real failures, NOT on missing inputs. Input validation
 *   happens at the controller boundary.
 */
import { sendPush } from '../channels/push.channel';
import { sendSms } from '../channels/sms.channel';
import { sendWhatsApp } from '../channels/whatsapp.channel';
import type { ChannelResult } from '../channels/whatsapp.channel';
import { NotifyErrors } from '../utils/errors';
import { logger } from '../utils/logger';

import { renderTemplate, type TemplateId } from './templates.service';

export interface DispatchInput {
  recipientPhone?: string;
  deviceToken?: string;
  template: TemplateId;
  params: Record<string, string>;
  channels?: Array<'whatsapp' | 'sms' | 'push'>; // default: ['whatsapp', 'sms']
}

export interface DispatchResult {
  template: TemplateId;
  results: ChannelResult[];
  anyDelivered: boolean;
}

export async function dispatch(input: DispatchInput): Promise<DispatchResult> {
  const channels = input.channels ?? ['whatsapp', 'sms'];
  const results: ChannelResult[] = [];

  // WhatsApp first (preferred)
  if (channels.includes('whatsapp') && input.recipientPhone) {
    try {
      const rendered = renderTemplate(input.template, 'whatsapp', input.params);
      const result = await sendWhatsApp({ to: input.recipientPhone, body: rendered.body });
      results.push(result);
      if (result.delivered) {
        logger.info(
          { template: input.template, channel: 'whatsapp' },
          'Notification dispatched via WhatsApp',
        );
        // WhatsApp succeeded — don't fall back to SMS, but still send push
        if (channels.includes('push') && input.deviceToken) {
          const pushRendered = renderTemplate(input.template, 'push', input.params);
          const pushResult = await sendPush({
            deviceToken: input.deviceToken,
            title: pushRendered.title ?? 'Ping',
            body: pushRendered.body,
          });
          results.push(pushResult);
        }
        return { template: input.template, results, anyDelivered: true };
      }
    } catch (err) {
      logger.warn({ err, template: input.template }, 'WhatsApp dispatch failed — falling back');
    }
  }

  // SMS fallback
  if (channels.includes('sms') && input.recipientPhone) {
    try {
      const rendered = renderTemplate(input.template, 'sms', input.params);
      const result = await sendSms({ to: input.recipientPhone, body: rendered.body });
      results.push(result);
    } catch (err) {
      logger.warn({ err, template: input.template }, 'SMS dispatch failed');
    }
  }

  // Push (parallel for app users)
  if (channels.includes('push') && input.deviceToken) {
    try {
      const rendered = renderTemplate(input.template, 'push', input.params);
      const result = await sendPush({
        deviceToken: input.deviceToken,
        title: rendered.title ?? 'Ping',
        body: rendered.body,
      });
      results.push(result);
    } catch (err) {
      logger.warn({ err, template: input.template }, 'Push dispatch failed');
    }
  }

  const anyDelivered = results.some((r) => r.delivered);
  if (!anyDelivered && results.length > 0) {
    throw NotifyErrors.AllChannelsFailed();
  }

  return { template: input.template, results, anyDelivered };
}
