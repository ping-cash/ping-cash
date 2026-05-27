#!/usr/bin/env node
/**
 * Walk the full Phase-1 USDC→PHP corridor end-to-end and assert each stage's
 * response shape. CI-runnable; exits non-zero on the first mismatch.
 *
 * Stages exercised:
 *   1. POST /auth/init    → sessionId
 *   2. POST /auth/verify  → user.walletAddress + tokens.accessToken (JWT)
 *   3. POST /transfers    → senderId + claimCode (real usr_<hex>, not usr_development)
 *   4. GET  /claims/{cc}  → status=pending, amount.value matches
 *   5. POST /claims/{cc}/otp     → sent=true
 *   6. POST /claims/{cc}/verify  → verified=true + verificationToken + cashoutMethods[4]
 *   7. POST /claims/{cc}/cashout → status=processing + offrampReference=PING-<hex>
 *
 * Default endpoint: https://app.ping.cash (override via PING_ENDPOINT).
 * Default amount: $50; method: gcash. Override AMOUNT_USD, CASHOUT_METHOD.
 */

const ENDPOINT = process.env.PING_ENDPOINT || 'https://app.ping.cash';
const AMOUNT_USD = process.env.AMOUNT_USD || '50.00';
const CASHOUT_METHOD = process.env.CASHOUT_METHOD || 'gcash';
// Test phones use the UK Ofcom drama range (+447700990XXX). auth-service is
// configured via OTP_TEST_PHONES=+447700990 to bypass Twilio for this prefix
// and accept code '123456'. Real users on other prefixes hit real Twilio Verify.
const RECIPIENT_PHONE =
  process.env.RECIPIENT_PHONE || `+447700990${String((Date.now() % 5000) + 5000).padStart(4, '0')}`;
const SENDER_PHONE =
  process.env.SENDER_PHONE || `+447700990${String(Date.now() % 5000).padStart(4, '0')}`;

let failed = 0;
function ok(stage, msg) {
  console.log(`✓ ${stage} ${msg}`);
}
function bad(stage, msg) {
  console.error(`✗ ${stage} ${msg}`);
  failed++;
}

async function postJson(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${ENDPOINT}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    return { status: res.status, json: null, raw: text };
  }
  return { status: res.status, json, raw: text };
}

async function getJson(path) {
  const res = await fetch(`${ENDPOINT}${path}`);
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : {} };
}

async function main() {
  console.log(`Walking ${ENDPOINT}  (sender=${SENDER_PHONE}  amount=${AMOUNT_USD} USD  method=${CASHOUT_METHOD})\n`);

  // Stage 1
  const init = await postJson('/auth/init', { phone: SENDER_PHONE, channel: 'sms' });
  if (init.status !== 200) bad('1. /auth/init', `status=${init.status}`);
  else if (!init.json.sessionId?.startsWith('sess_')) bad('1. /auth/init', `no sessionId; got ${JSON.stringify(init.json)}`);
  else ok('1. /auth/init', init.json.sessionId.slice(0, 24) + '…');

  // Stage 2
  const verify = await postJson('/auth/verify', { sessionId: init.json.sessionId, code: '123456' });
  if (verify.status !== 200) bad('2. /auth/verify', `status=${verify.status}`);
  else if (!verify.json.tokens?.accessToken) bad('2. /auth/verify', 'no accessToken');
  else if (!verify.json.user?.walletAddress) bad('2. /auth/verify', 'no walletAddress');
  else ok('2. /auth/verify', `user=${verify.json.user.id}  jwt=${verify.json.tokens.accessToken.length}b`);
  const token = verify.json.tokens?.accessToken;

  // Stage 3
  const xfer = await postJson(
    '/transfers',
    {
      recipientPhone: RECIPIENT_PHONE,
      amount: AMOUNT_USD,
      currency: 'USD',
      note: 'walk-full-corridor.mjs',
    },
    token
  );
  if (xfer.status !== 201 && xfer.status !== 200) bad('3. /transfers', `status=${xfer.status}; raw=${xfer.raw.slice(0,200)}`);
  else {
    const t = xfer.json.data?.transfer;
    if (!t?.claimCode) bad('3. /transfers', 'no claimCode');
    else if (!t.senderId?.startsWith('usr_') || t.senderId === 'usr_development') {
      bad('3. /transfers', `senderId='${t.senderId}' must be real usr_<hex>, NOT usr_development`);
    } else ok('3. /transfers', `senderId=${t.senderId}  claim=${t.claimCode}`);
  }
  const cc = xfer.json.data?.transfer?.claimCode;
  if (!cc) {
    console.error('\n✗ no claim code — aborting downstream stages');
    process.exit(1);
  }

  // Stage 4
  const c = await getJson(`/claims/${cc}`);
  if (c.status !== 200) bad('4. /claims/{cc}', `status=${c.status}`);
  else if (c.json.status !== 'pending') bad('4. /claims/{cc}', `status='${c.json.status}' expected 'pending'`);
  else if (c.json.amount?.value !== AMOUNT_USD) bad('4. /claims/{cc}', `amount.value='${c.json.amount?.value}' expected '${AMOUNT_USD}'`);
  else ok('4. /claims/{cc}', `status=pending amt=${c.json.amount.value} ${c.json.amount.currency}`);

  // Stage 5
  const otp = await postJson(`/claims/${cc}/otp`, { ip: '127.0.0.1' });
  if (otp.status !== 200) bad('5. /claims/.../otp', `status=${otp.status}`);
  else if (!otp.json.sent) bad('5. /claims/.../otp', `sent=${otp.json.sent}`);
  else ok('5. /claims/.../otp', `sent=true`);

  // Stage 6
  const vfy = await postJson(`/claims/${cc}/verify`, { code: '123456' });
  if (vfy.status !== 200) bad('6. /claims/.../verify', `status=${vfy.status}`);
  else if (!vfy.json.verified) bad('6. /claims/.../verify', `verified=${vfy.json.verified}`);
  else if (!vfy.json.verificationToken?.startsWith('vt_')) bad('6. /claims/.../verify', 'no vt_ token');
  else if (!Array.isArray(vfy.json.cashoutMethods) || vfy.json.cashoutMethods.length < 1) bad('6. /claims/.../verify', 'no cashoutMethods');
  else ok('6. /claims/.../verify', `verified=true  vt=${vfy.json.verificationToken.slice(0,12)}…  methods=${vfy.json.cashoutMethods.length}`);

  // Stage 7
  const cash = await postJson(`/claims/${cc}/cashout`, {
    method: CASHOUT_METHOD,
    account: RECIPIENT_PHONE,
    accountName: 'Walk User',
  });
  if (cash.status !== 200) bad('7. /claims/.../cashout', `status=${cash.status}; raw=${cash.raw.slice(0,200)}`);
  else if (cash.json.status !== 'processing') bad('7. /claims/.../cashout', `status='${cash.json.status}'`);
  else if (!/^PING-[A-F0-9]{8}$/.test(cash.json.offrampReference || '')) bad('7. /claims/.../cashout', `bad offrampReference='${cash.json.offrampReference}'`);
  else ok('7. /claims/.../cashout', `status=processing  ref=${cash.json.offrampReference}`);

  console.log(failed === 0 ? '\n✓ Full corridor walk PASS.' : `\n✗ ${failed} stage(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('walk FAILED:', err);
  process.exit(1);
});
