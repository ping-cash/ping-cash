# ADR 0020 — Pillar 4 send-side: unsigned-tx builder + client-signs-via-Privy-MPC

**Status:** Accepted · **Date:** 2026-05-24 · **Supersedes:** none · **Relates to:** [ADR 0017](0017-custody-model.md)

## Context

Pillar 4 (Transfer) has two distinct flows:

1. **Phone-claim flow** (canonical Phase-1 UX): sender enters a recipient phone number, `POST /transfers` creates a transfer row + 12-char claim code, recipient clicks the claim URL in web-claim, completes OTP + picks a cashout method, off-chain settlement fires via the offramp adapter. Already shipped + walked end-to-end (see EPIC #1 evidence comment 4526544089).

2. **Wallet-to-wallet flow** (target-state direct send): sender knows the recipient's Solana wallet address (e.g., a friend's Ping account) and wants to move USDC on-chain immediately without a claim code. The recipient just sees their balance increase. This is the missing pillar of Pillar 4 — the *send-side* of a non-custodial USDC P2P network.

ADR 0017 establishes that **wallet-service NEVER signs on behalf of users**. So the wallet-to-wallet flow needs a different shape than the phone-claim flow: the backend builds an *unsigned* transaction, the mobile client signs via the user's Privy MPC wallet, and the client submits to a Solana RPC.

## Decision

**`POST /wallet/send-intent` returns an unsigned, ready-to-sign SPL Token transferChecked transaction with full metadata for client-side blockhash refresh and signing.**

### Wire shape

Request:
```json
{ "recipientWallet": "<base58 Solana pubkey>", "amountUsdc": "<decimal string>" }
```

Response (200):
```json
{
  "senderWallet": "<from JWT claim>",
  "recipientWallet": "<echoed>",
  "amountUsdc": "<echoed>",
  "serializedTransaction": "<base64-encoded unsigned tx>",
  "expiresInSeconds": 60,
  "meta": {
    "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "program": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "associatedTokenProgram": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
    "senderAta": "<deterministic ATA addr per (mint, sender)>",
    "recipientAta": "<deterministic ATA addr per (mint, recipient)>",
    "decimals": 6,
    "amountAtomic": "<integer string>"
  }
}
```

### Transaction shape

The unsigned tx contains exactly two instructions in this order:

1. `createAssociatedTokenAccountIdempotentInstruction(sender, recipientAta, recipient, USDC mint)`
   - Sender pays the rent for recipient's USDC ATA if missing.
   - Idempotent: no-op if already exists. First-time recipients don't need a prior init tx.

2. `createTransferCheckedInstruction(senderAta, USDC mint, recipientAta, sender, amountAtomic, 6 decimals)`
   - The actual USDC transfer.
   - `transferChecked` (not plain `transfer`) ensures the client cannot accidentally specify wrong decimals — protects against UI bugs.

### Blockhash policy

Backend sets a **placeholder blockhash** (`11111111111111111111111111111111`) in the unsigned tx. The mobile client **MUST refresh** via `Connection.getLatestBlockhash()` before signing — the placeholder is intentionally invalid so that any signed-and-submitted tx without a fresh blockhash fails fast.

This avoids the backend ever calling Solana RPC on behalf of the user (which would couple backend availability to mainnet RPC + create a billing concern for high-traffic endpoints).

### Atomic-amount conversion

USDC has 6 decimals on Solana mainnet. The backend converts the decimal-string amount to atomic units exactly once, in `buildSendIntent`:

```ts
const amountAtomic = BigInt(Math.round(Number(amountUsdc) * 10 ** 6));
```

The atomic amount is included in both the transaction instruction AND the meta block so the mobile client can display "you're about to send 42.500000 USDC" with the same precision the on-chain transfer enforces.

### Failure modes (handled)

| Input | Response |
|---|---|
| Sender wallet absent from JWT | 404 WALLET_NOT_FOUND |
| Recipient address fails `new PublicKey()` | 400 INVALID_ADDRESS |
| Sender address fails `new PublicKey()` | 400 INVALID_ADDRESS |
| Recipient address < 32 or > 44 chars | 400 VALIDATION_ERROR (zod) |
| `amountUsdc` not `^\d+(\.\d{1,6})?$` | 400 VALIDATION_ERROR (zod) |

## Consequences

### Positive
- Backend has zero custody surface (no signing keys, no Solana RPC calls per send).
- Mobile client owns the signing context (Privy MPC inside the app's secure enclave / Privy-hosted MPC).
- Recipient ATA auto-creation removes the "you can't receive yet, init your account first" footgun.
- `transferChecked` + atomic-amount meta protect against off-by-decimal UI bugs.
- End-to-end e2e test possible: mint a JWT with a real Solana pubkey wallet claim, POST, deserialize the response into a `Transaction` object, assert instruction count + program IDs + amount.

### Negative
- Mobile client carries the responsibility of refreshing blockhash before signing. A naive client that signs the placeholder will fail-submit — this is the intended fail-fast behavior, but mobile devs need to know.
- The unsigned-tx pattern doesn't compose well with multi-instruction batched flows (e.g., "atomic unstake-and-send" from the Earn Vault). When Phase-2 introduces those, this ADR may need a follow-up for multi-instruction intent assembly.

### Comparison with phone-claim flow

The phone-claim flow remains the canonical Phase-1 UX (recipient doesn't need a Solana wallet to receive — they get a phone OTP). `send-intent` is the **direct-wallet-to-wallet** path used when:
- The mobile app shows a contact-picker of other Ping users with bound wallets
- A QR-scan flow encodes a `solana:` URI
- A "send to wallet address" power-user screen

Phase-1 ships the backend wire + mobile API client. Phase-2 ships the UX entry points.

## Implementation receipts

- Backend: [services/wallet/src/services/send.service.ts](../../services/wallet/src/services/send.service.ts) (89 lines)
- Backend tests: [services/wallet/src/services/send.service.test.ts](../../services/wallet/src/services/send.service.test.ts) (4 specs)
- Backend route: [services/wallet/src/controllers/wallet.controller.ts](../../services/wallet/src/controllers/wallet.controller.ts) (POST /send-intent + SendIntentBody zod schema)
- Mobile client: [apps/mobile/lib/api.ts](../../apps/mobile/lib/api.ts) (`ApiClient.buildSendIntent` + `SendIntent` interface)
- Deployed: `ghcr.io/ping-cash/wallet-service:cc0d237`; Sovereign pin `openova-private@6d501838`
- Per-Wave issue: [ping-cash#60](https://github.com/ping-cash/ping-cash/issues/60)
- EPIC evidence: [ping-cash#1 c.4526826842](https://github.com/ping-cash/ping-cash/issues/1#issuecomment-4526826842)
