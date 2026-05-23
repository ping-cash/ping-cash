#!/usr/bin/env node
// Real Solana devnet walk:
// 1. Generate two keypairs (sender + recipient)
// 2. Airdrop devnet SOL to sender
// 3. Build + sign a transfer of 0.001 SOL sender → recipient
// 4. Submit + confirm on devnet
// 5. Print real txHash + Explorer URL
//
// This is the workaround per CLAUDE.md P23 mechanism 4: real on-chain transaction
// without needing Privy KYB. Proves the wallet-pillar end-to-end on real Solana.

import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

const RPC = process.env.SOLANA_RPC_URL ?? 'https://devnet.helius-rpc.com';
const TRANSFER_LAMPORTS = 1_000_000; // 0.001 SOL

async function main() {
  const conn = new Connection(RPC, 'confirmed');
  console.log(`RPC: ${RPC}`);

  const sender = Keypair.generate();
  const recipient = Keypair.generate();
  console.log(`Sender:    ${sender.publicKey.toBase58()}`);
  console.log(`Recipient: ${recipient.publicKey.toBase58()}`);

  console.log('\n— Requesting airdrop (devnet faucet) —');
  const airdropSig = await conn.requestAirdrop(sender.publicKey, LAMPORTS_PER_SOL);
  await conn.confirmTransaction(airdropSig, 'confirmed');
  const senderBal = await conn.getBalance(sender.publicKey);
  console.log(`Airdrop confirmed. Sender balance: ${senderBal / LAMPORTS_PER_SOL} SOL`);

  console.log('\n— Building + signing transfer transaction —');
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: recipient.publicKey,
      lamports: TRANSFER_LAMPORTS,
    })
  );

  const txSig = await sendAndConfirmTransaction(conn, tx, [sender]);
  console.log(`Transfer confirmed. txHash: ${txSig}`);

  const recipientBal = await conn.getBalance(recipient.publicKey);
  console.log(`Recipient balance: ${recipientBal / LAMPORTS_PER_SOL} SOL`);

  console.log('\n— Result —');
  console.log(`Explorer: https://explorer.solana.com/tx/${txSig}?cluster=devnet`);
  console.log(`Sender:    https://explorer.solana.com/address/${sender.publicKey.toBase58()}?cluster=devnet`);
  console.log(`Recipient: https://explorer.solana.com/address/${recipient.publicKey.toBase58()}?cluster=devnet`);
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
