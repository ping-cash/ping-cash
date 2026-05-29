#!/usr/bin/env bash
# Deploy 4 anchor program .so artifacts to Solana devnet using the
# keypairs in programs/.devnet-keys/. Idempotent: solana program deploy
# detects existing program + does an upgrade if the on-chain bytes
# differ from the .so.
#
# Prerequisites:
#   - anchor build has produced target/deploy/<name>.so for each program
#   - solana-cli on PATH (v3.1.14+ for cargo edition2024 support)
#   - ~/.config/solana/id.json funded with ~10 SOL devnet (each upload
#     costs 2-3 SOL of rent + tx fees)
#
# Usage:
#   bash scripts/deploy-devnet-programs.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

DEPLOYER_KEYPAIR="${DEPLOYER_KEYPAIR:-$HOME/.config/solana/id.json}"
RPC="${SOLANA_RPC_URL:-https://api.devnet.solana.com}"

if [ ! -f "$DEPLOYER_KEYPAIR" ]; then
  echo "::error::deployer keypair missing at $DEPLOYER_KEYPAIR"
  echo "Generate one via: solana-keygen new -o $DEPLOYER_KEYPAIR --no-bip39-passphrase"
  exit 1
fi

DEPLOYER_PUBKEY=$(solana-keygen pubkey "$DEPLOYER_KEYPAIR")
DEPLOYER_BAL=$(solana balance "$DEPLOYER_PUBKEY" --url "$RPC" 2>&1 | awk '{print $1}')
echo "Deployer: $DEPLOYER_PUBKEY"
echo "Balance:  $DEPLOYER_BAL SOL"

if [ "${DEPLOYER_BAL%%.*}" -lt 6 ]; then
  echo "::warning::Deployer balance < 6 SOL; airdrop or top up before deploying all 4 programs"
fi

declare -A PROGRAMS=(
  [ping-token]="CXreEqusXpJwoFeEGN3w8qewAMu35XnmwQHrRskWtVyU"
  [earn-vault]="6rXJFpiHnSZ5ro5iYxQzzckX2kSEAqDbk3t3z3cBAUBG"
  [internal-swap]="65sbURwLh4S6YQ9WLgTj5nMnXqU6cYa3uETxXw1ezfTE"
  [pomm]="2EbCAf16SfymVfzu9B6cZAsTA4gYjuVQG13CaFgFWUPo"
)

ORDER=(ping-token earn-vault internal-swap pomm)

for name in "${ORDER[@]}"; do
  expected_id="${PROGRAMS[$name]}"
  so_underscored=$(echo "$name" | tr - _)
  so_path="target/deploy/${so_underscored}.so"
  keypair_path="programs/.devnet-keys/${name}-devnet-keypair.json"

  echo "=== $name ==="
  if [ ! -f "$so_path" ]; then
    echo "::error::missing $so_path — run anchor build first"
    exit 2
  fi
  if [ ! -f "$keypair_path" ]; then
    echo "::error::missing $keypair_path"
    exit 3
  fi
  derived=$(solana-keygen pubkey "$keypair_path")
  if [ "$derived" != "$expected_id" ]; then
    echo "::error::$keypair_path derives $derived but Anchor.toml/declare_id! expect $expected_id"
    exit 4
  fi

  echo "Deploying $name → $expected_id"
  solana program deploy \
    --url "$RPC" \
    --keypair "$DEPLOYER_KEYPAIR" \
    --program-id "$keypair_path" \
    --max-sign-attempts 5 \
    "$so_path"
done

echo
echo "Deploy complete. Verify with:"
echo "  node scripts/walk-devnet-programs.mjs"
