#!/usr/bin/env node
/**
 * Walk POST /wallet/send-intent end-to-end with a real Solana keypair
 * substituting for Privy MPC. Proves the Pillar 4 send-side wire works
 * from JWT mint → backend unsigned tx → client signing → signature verify.
 *
 * Does NOT submit to mainnet (no funded keypair). Submitting is a single
 * Connection.sendRawTransaction(signedTx.serialize()) call once a real
 * user wallet has USDC + SOL for rent.
 */
import { Keypair, Transaction } from '@solana/web3.js';
import { createHmac, createHash } from 'node:crypto';

const ENDPOINT = process.env.PING_ENDPOINT || 'https://app.ping.cash';
const JWT_SECRET =
  process.env.JWT_SECRET ||
  'phase1-stub-secret-32-chars-minimum-length-for-hs256-only';
const RECIPIENT =
  process.env.RECIPIENT_WALLET ||
  'So11111111111111111111111111111111111111112'; // wrapped-SOL mint as a test recipient
const AMOUNT_USDC = process.env.AMOUNT_USDC || '12.34';

const b64url = (b) =>
  Buffer.from(b).toString('base64url').replace(/=+$/, '');

function mintJwt(walletPubkey) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      sub: 'usr_walk_send_intent',
      phone: '00',
      wallet: walletPubkey,
      privyId: 'did:privy:walk:send-intent',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
    })
  );
  const sig = createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url')
    .replace(/=+$/, '');
  return `${header}.${payload}.${sig}`;
}

async function main() {
  // 1. Mint an ephemeral Solana keypair (Privy MPC substitute)
  const sender = Keypair.generate();
  const senderPubkey = sender.publicKey.toBase58();
  console.log('1. ephemeral sender pubkey:', senderPubkey);

  // 2. Mint a JWT with this keypair as the wallet claim
  const token = mintJwt(senderPubkey);
  console.log('2. JWT minted (len=' + token.length + ')');

  // 3. POST /wallet/send-intent
  const res = await fetch(`${ENDPOINT}/wallet/send-intent`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipientWallet: RECIPIENT,
      amountUsdc: AMOUNT_USDC,
    }),
  });
  if (!res.ok) {
    console.error('3. POST /wallet/send-intent FAILED:', res.status);
    console.error(await res.text());
    process.exit(1);
  }
  const intent = await res.json();
  console.log('3. POST /wallet/send-intent → 200');
  console.log('   senderAta:', intent.meta.senderAta);
  console.log('   recipientAta:', intent.meta.recipientAta);
  console.log('   amountAtomic:', intent.meta.amountAtomic);

  // 4. Deserialize the unsigned tx
  const txBuf = Buffer.from(intent.serializedTransaction, 'base64');
  const tx = Transaction.populate(
    /** @type {any} */ (await import('@solana/web3.js')).Message.from(txBuf),
    []
  );
  console.log(
    '4. deserialized — instructions:',
    tx.instructions.length,
    '/ feePayer:',
    tx.feePayer?.toBase58()
  );
  if (tx.instructions.length !== 2) {
    console.error('expected 2 instructions (CreateATA + TransferChecked)');
    process.exit(1);
  }

  // 5. Sign with the ephemeral keypair (Privy MPC substitute).
  // Note: the unsigned tx has a placeholder blockhash (11111...). In a real
  // mobile flow Privy refreshes via Connection.getLatestBlockhash() first.
  // For the signature-shape verification we sign as-is.
  tx.partialSign(sender);
  console.log('5. partial-signed with ephemeral keypair');

  // 6. Verify signature shape (real cryptographic check)
  const signatures = tx.signatures;
  const ourSig = signatures.find(
    (s) => s.publicKey.toBase58() === senderPubkey
  );
  if (!ourSig?.signature) {
    console.error('expected our signature to be present');
    process.exit(1);
  }
  console.log(
    '6. signature shape verified — sender sig length:',
    ourSig.signature.length,
    'bytes (64 expected for Ed25519)'
  );

  // 7. Final shape check — verifySignatures over the placeholder blockhash
  //    will return true because we signed exactly what's in the message
  const verifies = tx.verifySignatures(true);
  console.log('7. tx.verifySignatures() →', verifies);
  if (!verifies) {
    console.error('signature verification failed');
    process.exit(1);
  }

  console.log(
    '\n✓ Pillar 4 send-side end-to-end walk PASS.',
    '\n  Backend builds unsigned SPL Token transferChecked → client signs →',
    '\n  signature verifies cryptographically. Real submission needs:',
    '\n  (a) funded sender wallet, (b) fresh blockhash before signing.'
  );
}

main().catch((err) => {
  console.error('walk FAILED:', err);
  process.exit(1);
});
