/**
 * Notification template catalog.
 *
 * Per ARCHITECTURE.md § Notification Service Channels:
 *   Templates are versioned, ESL-friendly, work across WhatsApp/SMS/Push.
 *   Variables interpolated server-side; user input never substituted raw.
 */

export type TemplateId =
  | 'TRANSFER_RECEIVED'     // → recipient: "You received $X from <sender>"
  | 'TRANSFER_SENT'          // → sender: "Your $X to <recipient> is on the way"
  | 'CLAIM_REMINDER'         // → recipient: "Don't forget to claim your $X — expires in Yh"
  | 'CASHOUT_COMPLETE'       // → recipient: "₱X sent to your GCash"
  | 'CASHOUT_FAILED'         // → recipient: "Cash-out failed; please retry"
  | 'WELCOME_STAKE_GRANTED'  // → user: "You earned 1,200 $PING as your welcome stake"
  | 'MILESTONE_UNLOCKED'     // → user: "You unlocked 200 $PING (milestone: <name>)"
  | 'TIER_UPGRADED'          // → user: "Welcome to <tier>! Lower fees activated."
  | 'KYC_VERIFIED'           // → user: "Your identity is verified — new limits unlocked"
  | 'KYC_REJECTED'           // → user: "Identity verification could not be completed"
  | 'AUTH_OTP'               // → user: "Your Ping verification code: <code>"
  | 'CLAIM_OTP';             // → recipient: "Your Ping claim code: <code>"

export interface RenderedMessage {
  body: string;
  title?: string;
  shortBody?: string; // for SMS (160 char limit aware)
}

const TEMPLATES: Record<
  TemplateId,
  {
    whatsapp: (params: Record<string, string>) => string;
    sms: (params: Record<string, string>) => string;
    push: (params: Record<string, string>) => { title: string; body: string };
  }
> = {
  TRANSFER_RECEIVED: {
    whatsapp: (p) =>
      `🎉 You received ${p.amount} from ${p.senderName}!\n\n` +
      `Tap to claim: ${p.claimUrl}\n` +
      `Expires in 7 days.`,
    sms: (p) => `Ping: You received ${p.amount} from ${p.senderName}. Claim at ${p.claimUrl}`,
    push: (p) => ({
      title: `${p.amount} received`,
      body: `From ${p.senderName} — tap to claim`,
    }),
  },
  TRANSFER_SENT: {
    whatsapp: (p) =>
      `✓ Sent ${p.amount} to ${p.recipientName}.\n` +
      `Ref: ${p.reference}\n\n` +
      `Status: ${p.statusUrl}`,
    sms: (p) => `Ping: ${p.amount} sent to ${p.recipientName}. Ref ${p.reference}`,
    push: (p) => ({
      title: `${p.amount} sent`,
      body: `To ${p.recipientName}`,
    }),
  },
  CLAIM_REMINDER: {
    whatsapp: (p) =>
      `⏰ Don't forget — you have ${p.amount} from ${p.senderName} waiting.\n\n` +
      `Claim now: ${p.claimUrl}\n` +
      `Expires in ${p.hoursRemaining} hours.`,
    sms: (p) => `Ping reminder: claim ${p.amount} at ${p.claimUrl} — expires ${p.hoursRemaining}h`,
    push: (p) => ({
      title: `${p.amount} waiting`,
      body: `Tap to claim before it expires`,
    }),
  },
  CASHOUT_COMPLETE: {
    whatsapp: (p) =>
      `✅ ${p.localAmount} ${p.localCurrency} sent to your ${p.method}\n\n` +
      `Ref: ${p.reference}\n` +
      `Want to send next time? Get the Ping app: https://ping.cash/app`,
    sms: (p) => `Ping: ${p.localAmount} ${p.localCurrency} delivered to your ${p.method}. Ref ${p.reference}`,
    push: (p) => ({
      title: `${p.localAmount} ${p.localCurrency} delivered`,
      body: `To your ${p.method}`,
    }),
  },
  CASHOUT_FAILED: {
    whatsapp: (p) =>
      `❌ Cash-out failed: ${p.reason}\n\n` +
      `Your money is safe. Tap to retry: ${p.claimUrl}`,
    sms: (p) => `Ping: cash-out failed (${p.reason}). Retry: ${p.claimUrl}`,
    push: (p) => ({
      title: `Cash-out failed`,
      body: `Tap to retry`,
    }),
  },
  WELCOME_STAKE_GRANTED: {
    whatsapp: (_p) =>
      `🎁 Welcome to Ping! You earned 1,200 $PING as your welcome stake.\n\n` +
      `200 $PING is ready to pay your fees. The rest unlocks as you use Ping.\n\n` +
      `Tier: Silver — your transfers are 50% cheaper.`,
    sms: (_p) => `Ping: 1,200 $PING earned! You're now Silver tier — 50% off fees.`,
    push: (_p) => ({
      title: `🎁 Welcome stake earned`,
      body: `1,200 $PING — Silver tier activated`,
    }),
  },
  MILESTONE_UNLOCKED: {
    whatsapp: (p) =>
      `🏆 Milestone unlocked: ${p.milestone}\n\n` +
      `200 $PING moved from locked → free balance.\n` +
      `New free balance: ${p.newBalance} $PING`,
    sms: (p) => `Ping: 200 $PING unlocked (${p.milestone})! New balance: ${p.newBalance}`,
    push: (p) => ({
      title: `🏆 200 $PING unlocked`,
      body: p.milestone,
    }),
  },
  TIER_UPGRADED: {
    whatsapp: (p) =>
      `⬆️ Tier upgraded to ${p.tier}!\n\n` +
      `Your platform fees are now ${p.discount} off. Plus pay-in-PING for another 75% off.`,
    sms: (p) => `Ping: upgraded to ${p.tier}! ${p.discount} off fees.`,
    push: (p) => ({
      title: `⬆️ ${p.tier} tier unlocked`,
      body: `${p.discount} off fees`,
    }),
  },
  KYC_VERIFIED: {
    whatsapp: (p) =>
      `✅ Identity verified!\n\n` +
      `Your KYC tier: ${p.tier}\n` +
      `New limits: $${p.dailyLimit}/day, $${p.monthlyLimit}/month`,
    sms: (p) => `Ping: identity verified. Tier ${p.tier}.`,
    push: (p) => ({
      title: `✅ Verified`,
      body: `Tier ${p.tier} limits unlocked`,
    }),
  },
  KYC_REJECTED: {
    whatsapp: (p) =>
      `Your identity verification could not be completed.\n\n` +
      `Reason: ${p.reason}\n` +
      `You can retry by opening the Ping app.`,
    sms: (p) => `Ping: KYC could not complete (${p.reason}). Retry in app.`,
    push: (_p) => ({
      title: `Verification incomplete`,
      body: `Tap to retry`,
    }),
  },
  AUTH_OTP: {
    whatsapp: (p) => `Your Ping verification code: ${p.code}\n\nDo not share with anyone.`,
    sms: (p) => `Ping: ${p.code} is your verification code.`,
    push: (_p) => ({ title: '', body: '' }), // not delivered via push
  },
  CLAIM_OTP: {
    whatsapp: (p) => `Your Ping claim code: ${p.code}\n\nUse this to receive your money.`,
    sms: (p) => `Ping claim code: ${p.code}`,
    push: (_p) => ({ title: '', body: '' }),
  },
};

export function renderTemplate(
  template: TemplateId,
  channel: 'whatsapp' | 'sms' | 'push',
  params: Record<string, string>,
): RenderedMessage {
  const tpl = TEMPLATES[template];
  if (!tpl) {
    throw new Error(`Unknown template: ${template}`);
  }
  if (channel === 'whatsapp') return { body: tpl.whatsapp(params) };
  if (channel === 'sms') return { body: tpl.sms(params) };
  const push = tpl.push(params);
  return { body: push.body, title: push.title };
}

export function listTemplates(): TemplateId[] {
  return Object.keys(TEMPLATES) as TemplateId[];
}
