#!/usr/bin/env node
/**
 * Walk the 4 Phase-2 Solana programs on devnet: verify each program
 * account exists at its declared program ID + is owned by the BPF Loader
 * (i.e., actually deployed). This is the post-`anchor deploy` sanity check
 * for #70 — if a program ID returns null or non-bpf-loader owner, the
 * deploy regressed.
 *
 * Does NOT submit any transactions. Pure RPC read.
 *
 * Failure mode is per-program: prints the OK/FAIL line + non-zero exits
 * when any program is missing.
 */
import { Connection, PublicKey } from '@solana/web3.js';

const RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

const PROGRAMS = [
  { name: 'ping-token', id: 'CXreEqusXpJwoFeEGN3w8qewAMu35XnmwQHrRskWtVyU' },
  { name: 'earn-vault', id: '6rXJFpiHnSZ5ro5iYxQzzckX2kSEAqDbk3t3z3cBAUBG' },
  {
    name: 'internal-swap',
    id: '65sbURwLh4S6YQ9WLgTj5nMnXqU6cYa3uETxXw1ezfTE',
  },
  { name: 'pomm', id: '2EbCAf16SfymVfzu9B6cZAsTA4gYjuVQG13CaFgFWUPo' },
];

// Solana BPF Loader Upgradeable + non-upgradeable program IDs.
// Anchor deploys land under the upgradeable loader by default.
const BPF_LOADER_UPGRADEABLE = 'BPFLoaderUpgradeab1e11111111111111111111111';
const BPF_LOADER_2 = 'BPFLoader2111111111111111111111111111111111';

const connection = new Connection(RPC, 'confirmed');
let failures = 0;

for (const { name, id } of PROGRAMS) {
  const pk = new PublicKey(id);
  const info = await connection.getAccountInfo(pk, 'confirmed');
  if (!info) {
    console.error(`FAIL ${name.padEnd(15)} ${id}  not deployed`);
    failures += 1;
    continue;
  }
  const owner = info.owner.toBase58();
  const isBpfLoader =
    owner === BPF_LOADER_UPGRADEABLE || owner === BPF_LOADER_2;
  if (!isBpfLoader) {
    console.error(
      `FAIL ${name.padEnd(15)} ${id}  owner=${owner} (not BPF loader)`
    );
    failures += 1;
    continue;
  }
  console.log(
    `OK   ${name.padEnd(15)} ${id}  ${info.data.length}B  owner=${owner.slice(0, 8)}…`
  );
}

if (failures > 0) {
  console.error(`\n${failures}/${PROGRAMS.length} programs not deployed`);
  process.exit(1);
}
console.log(`\nAll ${PROGRAMS.length} Phase-2 programs deployed on devnet ✓`);
