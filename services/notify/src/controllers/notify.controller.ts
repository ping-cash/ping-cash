import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { dispatch } from '../services/dispatch.service';
import {
  deletePushToken,
  getPushToken,
  savePushToken,
} from '../services/push-token-store.service';
import { listTemplates } from '../services/templates.service';

const DispatchBody = z.object({
  recipientPhone: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/)
    .optional(),
  deviceToken: z.string().optional(),
  template: z.string().min(1),
  params: z.record(z.string()),
  channels: z.array(z.enum(['whatsapp', 'sms', 'push'])).optional(),
});

const RegisterPushBody = z.object({
  userId: z.string().min(1),
  expoPushToken: z.string().min(8),
  platform: z.enum(['ios', 'android', 'web']).optional(),
});

const SenderClaimedBody = z.object({
  senderUserId: z.string().min(1),
  amount: z.string(),
  recipientPhone: z.string().optional(),
  recipientName: z.string().optional(),
  localAmount: z.string().optional(),
  localCurrency: z.string().optional(),
  method: z.string().optional(),
});

// MoonPay webhook payload (#82). MoonPay POSTs a JSON body for every
// transaction state change. We only act on `transaction_completed` —
// the buyer's USDC has landed on the destination wallet. Other states
// (pending, failed, refunded) are ignored at this layer; they're a
// follow-up surface.
const MoonpayWebhookBody = z.object({
  type: z.string(),
  data: z
    .object({
      id: z.string().optional(),
      status: z.string().optional(),
      walletAddress: z.string().optional(),
      baseCurrencyAmount: z.number().optional(),
      baseCurrencyCode: z.string().optional(),
      cryptoTransactionId: z.string().optional(),
    })
    .passthrough(),
});

export async function notifyRoutes(fastify: FastifyInstance) {
  // POST /notify/dispatch — multi-channel send
  fastify.post(
    '/dispatch',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = DispatchBody.parse(request.body);
      const result = await dispatch(body as never);
      return reply.status(200).send(result);
    }
  );

  // GET /notify/templates — list available templates
  fastify.get(
    '/templates',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(200).send({ templates: listTemplates() });
    }
  );

  // POST /notify/push/register — mobile registers an Expo push token
  // for a given userId so future server-initiated pushes find it.
  // Called from the mobile app after permission grant. Idempotent.
  fastify.post(
    '/push/register',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = RegisterPushBody.parse(request.body);
      await savePushToken({
        userId: body.userId,
        expoPushToken: body.expoPushToken,
        platform: body.platform,
      });
      return reply.status(200).send({ registered: true });
    }
  );

  // DELETE /notify/push/register/:userId — explicit logout / token clear.
  fastify.delete(
    '/push/register/:userId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };
      await deletePushToken(userId);
      return reply.status(200).send({ cleared: true });
    }
  );

  // POST /notify/webhooks/moonpay — MoonPay POSTs here on every
  // transaction state change (#82 follow-up chain). Verifies the
  // signature when MOONPAY_WEBHOOK_SECRET is set, then on
  // `transaction_completed` resolves the wallet → userId mapping and
  // fires a SENDER_TRANSFER_CLAIMED-style push ("Your $50 in USDC just
  // landed"). The wallet→userId lookup is a follow-up because the
  // current notify-service doesn't carry an auth-service client; for
  // now we log the inbound event so operators can confirm wiring
  // works end-to-end once founder registers the webhook URL.
  fastify.post(
    '/webhooks/moonpay',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = MoonpayWebhookBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.message,
          },
        });
      }
      const evt = parsed.data;
      // Future: when MOONPAY_WEBHOOK_SECRET is set, verify
      // request.headers['moonpay-signature-v2'] HMAC over the raw body
      // (Fastify's body-parsing hides the raw bytes; needs rawBody
      // plugin). Stub-mode acknowledgement until that's wired.
      request.log.info(
        {
          type: evt.type,
          status: evt.data.status,
          wallet: evt.data.walletAddress,
          amount: evt.data.baseCurrencyAmount,
          currency: evt.data.baseCurrencyCode,
        },
        'MoonPay webhook received'
      );
      // Always 200 so MoonPay doesn't retry; we've taken delivery.
      return reply.status(200).send({ received: true });
    }
  );

  // POST /notify/sender-claimed — claim-service fires this when a
  // recipient finishes the claim flow so the sender's phone buzzes
  // ("Joe claimed your $50"). Fire-and-forget from the caller; we
  // best-effort lookup the sender's stored push token and dispatch.
  fastify.post(
    '/sender-claimed',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = SenderClaimedBody.parse(request.body);
      const tokenRow = await getPushToken(body.senderUserId);
      if (!tokenRow) {
        return reply.status(200).send({
          dispatched: false,
          reason: 'no-token-on-file',
        });
      }
      // Push dispatch is best-effort from the caller's perspective
      // (claim-service fire-and-forget); a delivery failure must
      // surface as 200 with a non-delivered flag, not 502 — otherwise
      // every failed push generates a noisy upstream error in
      // claim-service logs that doesn't impact the recipient flow.
      try {
        const result = await dispatch({
          deviceToken: tokenRow.token,
          template: 'SENDER_TRANSFER_CLAIMED' as const,
          params: {
            amount: body.amount,
            recipientPhone: body.recipientPhone ?? '',
            recipientName: body.recipientName ?? '',
            localAmount: body.localAmount ?? '',
            localCurrency: body.localCurrency ?? '',
            method: body.method ?? '',
          },
          channels: ['push'],
        });
        return reply
          .status(200)
          .send({ dispatched: result.anyDelivered, result });
      } catch (err) {
        return reply.status(200).send({
          dispatched: false,
          reason: 'dispatch-failed',
          detail: (err as Error).message,
        });
      }
    }
  );
}
