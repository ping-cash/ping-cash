import { createHmac, timingSafeEqual } from 'node:crypto';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { dispatch } from '../services/dispatch.service';
import {
  deletePushToken,
  getPushToken,
  savePushToken,
} from '../services/push-token-store.service';
import { listTemplates } from '../services/templates.service';

/**
 * Verify Stripe's `Stripe-Signature` header per
 * https://stripe.com/docs/webhooks/signatures. Header shape:
 *   t=<unix-ts>,v1=<hmac-sha256-hex(t.rawBody, whsec)>[,v0=...]
 * Returns true when at least one v1 entry matches.
 * Replay protection: timestamp must be within ±5 min of now.
 *
 * When STRIPE_WEBHOOK_SECRET is unset we return true (dev-mode bypass)
 * so the webhook still functions end-to-end before founder lands the
 * whsec_ in the cluster Secret. This narrows to verified-only at the
 * moment STRIPE_WEBHOOK_SECRET appears.
 */
export function verifyStripeSignature(
  rawBody: string,
  sigHeader: string | undefined,
  secret: string | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!secret) return true; // dev-mode bypass — see comment above
  if (!sigHeader) return false;

  let timestamp: string | null = null;
  const sigsV1: string[] = [];
  for (const part of sigHeader.split(',')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === 't') timestamp = v;
    else if (k === 'v1') sigsV1.push(v);
  }
  if (!timestamp || sigsV1.length === 0) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > 300) return false;

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest();
  for (const candidate of sigsV1) {
    if (candidate.length !== expected.length * 2) continue;
    let given: Buffer;
    try {
      given = Buffer.from(candidate, 'hex');
    } catch {
      continue;
    }
    if (given.length === expected.length && timingSafeEqual(given, expected)) {
      return true;
    }
  }
  return false;
}

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

/**
 * Verify Onramper's `X-Onramper-Signature` header.
 * Onramper sends a hex-encoded HMAC-SHA256 of the raw request body
 * computed with the partner's webhook secret. Timing-safe comparison.
 *
 * When ONRAMPER_WEBHOOK_SECRET is unset we return true (dev-mode bypass)
 * so the webhook still functions end-to-end before the secret lands in
 * the cluster Secret. Narrows to verified-only once the secret appears.
 */
export function verifyOnramperSignature(
  rawBody: string,
  sigHeader: string | undefined,
  secret: string | undefined
): boolean {
  if (!secret) return true; // dev-mode bypass
  if (!sigHeader) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  if (sigHeader.length !== expected.length * 2) return false;
  let given: Buffer;
  try {
    given = Buffer.from(sigHeader, 'hex');
  } catch {
    return false;
  }
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}

// Onramper webhook payload — per docs.onramper.com/docs/webhooks.
// On `transaction_completed` the user's USDC has landed on the wallet
// address we passed in `wallets=usdc_base:<addr>` at checkout-URL
// build time. We dispatch a push notification ("Your USDC just
// landed") and log for ledger reconciliation. The user's wallet was
// already credited by Onramper-Topper-Base — Ping does not need to
// fund anything from treasury (unlike Stripe-shape where Ping bridges
// fiat -> on-chain itself).
const OnramperWebhookBody = z
  .object({
    type: z.string(),
    data: z
      .object({
        id: z.string().optional(),
        status: z.string().optional(),
        walletAddress: z.string().optional(),
        inCurrency: z.string().optional(),
        inAmount: z.number().optional(),
        outCurrency: z.string().optional(),
        outAmount: z.number().optional(),
        txHash: z.string().optional(),
        partnerData: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

// Stripe webhook payload — emits `payment_intent.succeeded` after the
// user finishes the PaymentSheet. On success we credit USDC on-chain
// from treasury to the user's wallet (devnet now, mainnet at cutover).
// PaymentIntent.metadata carries `userId` + `walletAddress` set by
// wallet-service buildCashinIntent so we can look the recipient up
// without an extra DB hit.
const StripeWebhookBody = z
  .object({
    type: z.string(),
    data: z
      .object({
        object: z
          .object({
            id: z.string(),
            amount_received: z.number().optional(),
            currency: z.string().optional(),
            metadata: z
              .object({
                // cashin.service.ts uses these specific keys when it
                // creates the PaymentIntent; webhook must read the same.
                pingUserId: z.string().optional(),
                pingWallet: z.string().optional(),
                pingMethod: z.string().optional(),
              })
              .passthrough()
              .optional(),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

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

  // POST /notify/webhooks/onramper — Onramper cash-in webhook (ADR 0026).
  // Onramper POSTs here when a user finishes the checkout flow at the
  // signed buy.onramper.com URL we built in wallet-service cashin.
  // On `transaction_completed`, USDC has already been delivered to the
  // user's wallet by Onramper-Topper-Base; we (a) verify signature,
  // (b) dispatch a push notification, (c) log for ledger reconciliation.
  // No treasury fund call — unlike the prior Stripe shape where Ping
  // bridged fiat->on-chain itself, Onramper handles the on-chain delivery.
  fastify.post(
    '/webhooks/onramper',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const rawBody =
        (request as FastifyRequest & { rawBody?: string }).rawBody ?? '';
      const sigHeader = request.headers['x-onramper-signature'];
      const secret = process.env.ONRAMPER_WEBHOOK_SECRET;

      if (
        !verifyOnramperSignature(
          rawBody,
          typeof sigHeader === 'string' ? sigHeader : undefined,
          secret
        )
      ) {
        request.log.warn(
          { hasSigHeader: !!sigHeader, hasSecret: !!secret },
          'Onramper webhook signature verification failed'
        );
        return reply.status(400).send({
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Onramper signature mismatch',
          },
        });
      }

      const parsed = OnramperWebhookBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
        });
      }
      const evt = parsed.data;
      const tx = evt.data;

      // Only act on transaction_completed; other states (created, pending,
      // failed) are accepted with 200 so Onramper doesn't retry. Push
      // dispatch happens only on success.
      if (evt.type !== 'transaction_completed' && tx.status !== 'completed') {
        request.log.info(
          { type: evt.type, status: tx.status, txId: tx.id },
          'Onramper webhook received (non-credit event)'
        );
        return reply.status(200).send({ received: true });
      }

      // Extract userId from partnerData (we set `userId=<sub>` at
      // checkout-URL build time per wallet-service onramper.adapter.ts).
      let userId: string | undefined;
      if (tx.partnerData?.startsWith('userId=')) {
        userId = tx.partnerData.slice('userId='.length);
      }

      request.log.info(
        {
          txId: tx.id,
          walletAddress: tx.walletAddress,
          inAmount: tx.inAmount,
          inCurrency: tx.inCurrency,
          outAmount: tx.outAmount,
          outCurrency: tx.outCurrency,
          txHash: tx.txHash,
          userId,
        },
        'Onramper transaction_completed — USDC delivered'
      );

      // Best-effort push notification ("Your USDC just landed"). Skip
      // gracefully if no userId or no push token on file. Uses
      // CASHIN_COMPLETED template (follow-up: register the template in
      // templates.service.ts when copy is finalized; for now we route
      // through dispatch with `as never` to bypass the closed-union
      // TemplateId check — same pattern as line ~153 dispatch).
      if (userId) {
        try {
          const tokenRow = await getPushToken(userId);
          if (tokenRow) {
            await dispatch({
              deviceToken: tokenRow.token,
              template: 'CASHIN_COMPLETED',
              params: {
                outAmount: String(tx.outAmount ?? ''),
                outCurrency: String(tx.outCurrency ?? 'USDC'),
                inAmount: String(tx.inAmount ?? ''),
                inCurrency: String(tx.inCurrency ?? 'USD'),
              },
            } as never);
          }
        } catch (err) {
          request.log.warn(
            { userId, err: (err as Error).message },
            'Onramper push dispatch failed (non-fatal)'
          );
        }
      }

      return reply.status(200).send({ received: true, credited: true });
    }
  );

  // POST /notify/webhooks/stripe — Stripe webhook endpoint configured at
  // https://dashboard.stripe.com/test/webhooks (founder action, separate
  // from API keys). On `payment_intent.succeeded` we credit the buyer's
  // wallet on-chain by calling wallet-service /internal/fund-new-wallet
  // with the recipient address from PaymentIntent.metadata. STRIPE_WEBHOOK_SECRET
  // signature verification is a follow-up — until that lands we trust the
  // payload + rely on the internal cluster network as the trust boundary.
  fastify.post(
    '/webhooks/stripe',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const rawBody =
        (request as FastifyRequest & { rawBody?: string }).rawBody ?? '';
      const sigHeader = request.headers['stripe-signature'];
      const secret = process.env.STRIPE_WEBHOOK_SECRET;

      if (
        !verifyStripeSignature(
          rawBody,
          typeof sigHeader === 'string' ? sigHeader : undefined,
          secret
        )
      ) {
        request.log.warn(
          { hasSigHeader: !!sigHeader, hasSecret: !!secret },
          'Stripe webhook signature verification failed'
        );
        return reply.status(400).send({
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Stripe signature mismatch',
          },
        });
      }

      const parsed = StripeWebhookBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: parsed.error.message },
        });
      }
      const evt = parsed.data;
      const pi = evt.data.object;
      const meta = pi.metadata ?? {};

      // Only act on payment_intent.succeeded. Other events (failed,
      // canceled, requires_action) are accepted with 200 so Stripe
      // doesn't retry; treasury credit only happens on success.
      if (evt.type !== 'payment_intent.succeeded') {
        request.log.info(
          { type: evt.type, paymentIntent: pi.id },
          'Stripe webhook received (non-credit event)'
        );
        return reply.status(200).send({ received: true });
      }

      const recipient = meta.pingWallet;
      if (!recipient) {
        request.log.warn(
          { paymentIntent: pi.id, metadata: meta },
          'Stripe payment_intent.succeeded missing pingWallet metadata'
        );
        return reply.status(200).send({
          received: true,
          credited: false,
          reason: 'no-wallet-in-metadata',
        });
      }

      // Fire-and-forget call to wallet-service /internal/fund-new-wallet.
      // The shared INTERNAL_SERVICE_SECRET is the cluster's auth boundary
      // for service-to-service RPCs.
      const internalSecret = process.env.INTERNAL_SERVICE_SECRET ?? '';
      const walletSvc =
        process.env.WALLET_SERVICE_URL ??
        'http://wallet-service.ping.svc.cluster.local';

      try {
        const res = await fetch(
          `${walletSvc}/wallet/internal/fund-new-wallet`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-internal-secret': internalSecret,
            },
            body: JSON.stringify({ recipientAddress: recipient }),
          }
        );
        const json = (await res.json()) as {
          funded?: boolean;
          txSignature?: string;
          reason?: string;
        };
        request.log.info(
          {
            paymentIntent: pi.id,
            recipient,
            userId: meta.pingUserId ?? null,
            method: meta.pingMethod ?? null,
            funded: json.funded,
            txSignature: json.txSignature ?? null,
            reason: json.reason ?? null,
          },
          'Stripe → on-chain credit dispatched'
        );
        return reply.status(200).send({
          received: true,
          credited: !!json.funded,
          txSignature: json.txSignature ?? null,
        });
      } catch (err) {
        request.log.error(
          { paymentIntent: pi.id, recipient, err: (err as Error).message },
          'Stripe → on-chain credit failed'
        );
        // Always 200 so Stripe doesn't retry — the operator can manually
        // settle via /wallet/internal/fund-new-wallet if needed.
        return reply.status(200).send({
          received: true,
          credited: false,
          reason: (err as Error).message,
        });
      }
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
