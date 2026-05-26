-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "privyUserId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "phoneEncrypted" TEXT,
    "displayName" TEXT,
    "email" TEXT,
    "avatarUrl" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT,
    "country" VARCHAR(3),
    "kycTier" INTEGER NOT NULL DEFAULT 0,
    "kycVerifiedAt" TIMESTAMP(3),
    "kycExpiresAt" TIMESTAMP(3),
    "dailyLimitUsdc" DECIMAL(20,8) NOT NULL DEFAULT 200.00,
    "monthlyLimitUsdc" DECIMAL(20,8) NOT NULL DEFAULT 1000.00,
    "dailyUsedUsdc" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "monthlyUsedUsdc" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "dailyResetAt" TIMESTAMP(3),
    "monthlyResetAt" TIMESTAMP(3),
    "pingPointsFreeBalance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "pingPointsWelcomeLocked" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "pingPointsWelcomeUnlocked" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "welcomeStakeGrantedAt" TIMESTAMP(3),
    "welcomeStakeBackstopAt" TIMESTAMP(3),
    "tier" TEXT NOT NULL DEFAULT 'bronze',
    "totalSentUsdc" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "totalReceivedUsdc" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "transferCount" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PingPointsLedger" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "changeAmount" DECIMAL(20,8) NOT NULL,
    "newFreeBalance" DECIMAL(20,8) NOT NULL,
    "newWelcomeLocked" DECIMAL(20,8) NOT NULL,
    "newWelcomeUnlocked" DECIMAL(20,8) NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "tierAtTime" TEXT NOT NULL,
    "pingPointsBalanceAtTime" DECIMAL(20,8) NOT NULL,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PingPointsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WelcomeMilestone" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "milestone" TEXT NOT NULL,
    "achievedAt" TIMESTAMP(3),
    "unlockedAt" TIMESTAMP(3),
    "unlockedAmount" DECIMAL(20,8) NOT NULL DEFAULT 200,
    "progressData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WelcomeMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "contactPhoneHash" TEXT NOT NULL,
    "contactPhoneMasked" TEXT NOT NULL,
    "displayName" TEXT,
    "isRegistered" BOOLEAN NOT NULL DEFAULT false,
    "registeredUserId" UUID,
    "lastTransferAt" TIMESTAMP(3),
    "transferCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_privyUserId_key" ON "User"("privyUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneHash_key" ON "User"("phoneHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phoneHash_idx" ON "User"("phoneHash");

-- CreateIndex
CREATE INDEX "User_walletAddress_idx" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "User_privyUserId_idx" ON "User"("privyUserId");

-- CreateIndex
CREATE INDEX "User_kycTier_idx" ON "User"("kycTier");

-- CreateIndex
CREATE INDEX "User_tier_idx" ON "User"("tier");

-- CreateIndex
CREATE INDEX "PingPointsLedger_userId_createdAt_idx" ON "PingPointsLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PingPointsLedger_reasonCode_idx" ON "PingPointsLedger"("reasonCode");

-- CreateIndex
CREATE INDEX "PingPointsLedger_createdAt_idx" ON "PingPointsLedger"("createdAt");

-- CreateIndex
CREATE INDEX "WelcomeMilestone_userId_idx" ON "WelcomeMilestone"("userId");

-- CreateIndex
CREATE INDEX "WelcomeMilestone_milestone_idx" ON "WelcomeMilestone"("milestone");

-- CreateIndex
CREATE UNIQUE INDEX "WelcomeMilestone_userId_milestone_key" ON "WelcomeMilestone"("userId", "milestone");

-- CreateIndex
CREATE INDEX "Contact_ownerUserId_idx" ON "Contact"("ownerUserId");

-- CreateIndex
CREATE INDEX "Contact_contactPhoneHash_idx" ON "Contact"("contactPhoneHash");

-- CreateIndex
CREATE INDEX "Contact_registeredUserId_idx" ON "Contact"("registeredUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_ownerUserId_contactPhoneHash_key" ON "Contact"("ownerUserId", "contactPhoneHash");

-- AddForeignKey
ALTER TABLE "PingPointsLedger" ADD CONSTRAINT "PingPointsLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WelcomeMilestone" ADD CONSTRAINT "WelcomeMilestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

