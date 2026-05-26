-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient_phone" TEXT NOT NULL,
    "recipient_phone_hash" TEXT NOT NULL,
    "recipient_user_id" TEXT,
    "amount" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "fee_amount" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "version" INTEGER NOT NULL DEFAULT 1,
    "claim_code" TEXT NOT NULL,
    "claim_url" TEXT NOT NULL,
    "claim_expires_at" TIMESTAMP(3) NOT NULL,
    "blockchain_chain" TEXT,
    "blockchain_tx_hash" TEXT,
    "blockchain_confirmed_at" TIMESTAMP(3),
    "claim_bridge_acked_at" TIMESTAMP(3),
    "cashout_method" TEXT,
    "cashout_local_amount" TEXT,
    "cashout_local_currency" TEXT,
    "cashout_reference" TEXT,
    "cashout_completed_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "key" TEXT,
    "payload" JSONB NOT NULL,
    "headers" JSONB,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transfers_claim_code_key" ON "transfers"("claim_code");

-- CreateIndex
CREATE INDEX "transfers_sender_id_idx" ON "transfers"("sender_id");

-- CreateIndex
CREATE INDEX "transfers_recipient_phone_hash_idx" ON "transfers"("recipient_phone_hash");

-- CreateIndex
CREATE INDEX "transfers_recipient_user_id_idx" ON "transfers"("recipient_user_id");

-- CreateIndex
CREATE INDEX "transfers_status_idx" ON "transfers"("status");

-- CreateIndex
CREATE INDEX "transfers_created_at_idx" ON "transfers"("created_at");

-- CreateIndex
CREATE INDEX "transfers_sender_id_created_at_idx" ON "transfers"("sender_id", "created_at");

-- CreateIndex
CREATE INDEX "outbox_published_created_at_idx" ON "outbox"("published", "created_at");

┌─────────────────────────────────────────────────────────┐
│  Update available 5.22.0 -> 7.8.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘
