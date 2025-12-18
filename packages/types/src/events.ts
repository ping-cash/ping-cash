// ============================================
// Cash Platform - Event Types (CloudEvents)
// ============================================

import type {
  UUID,
  PhoneNumber,
  ISOTimestamp,
  Decimal,
  Currency,
  Chain,
  TransferStatus,
  ClaimStatus,
  CashoutMethod,
  CashoutStatus,
  KYCStatus,
  KYCTier,
  NotificationChannel,
  NotificationType,
} from './index';

// ============================================
// CloudEvents Base
// ============================================

export interface CloudEvent<T> {
  specversion: '1.0';
  type: string;
  source: string;
  id: string;
  time: ISOTimestamp;
  datacontenttype: 'application/json';
  data: T;
  // Extensions
  correlationid?: string;
  causationid?: string;
}

// ============================================
// Event Topics
// ============================================

export const EventTopics = {
  AUTH: 'auth.events',
  USER: 'user.events',
  KYC: 'kyc.events',
  TRANSFER: 'transfer.events',
  WALLET: 'wallet.events',
  LEDGER: 'ledger.events',
  CLAIM: 'claim.events',
  OFFRAMP: 'offramp.events',
  NOTIFY: 'notify.commands',
  AUDIT: 'audit.events',
} as const;

export type EventTopic = (typeof EventTopics)[keyof typeof EventTopics];

// ============================================
// Auth Events
// ============================================

export interface OTPRequestedEvent {
  phone: PhoneNumber;
  channel: 'sms' | 'whatsapp';
  expiresAt: ISOTimestamp;
}

export interface OTPVerifiedEvent {
  userId: UUID;
  phone: PhoneNumber;
  isNewUser: boolean;
}

export interface SessionCreatedEvent {
  sessionId: UUID;
  userId: UUID;
  expiresAt: ISOTimestamp;
}

export interface SessionRevokedEvent {
  sessionId: UUID;
  userId: UUID;
  reason: 'logout' | 'expired' | 'revoked';
}

// ============================================
// User Events
// ============================================

export interface UserCreatedEvent {
  userId: UUID;
  phone: PhoneNumber;
  createdAt: ISOTimestamp;
}

export interface UserUpdatedEvent {
  userId: UUID;
  changes: {
    name?: string;
    email?: string;
  };
  updatedAt: ISOTimestamp;
}

export interface ContactsSyncedEvent {
  userId: UUID;
  totalContacts: number;
  matchedContacts: number;
}

// ============================================
// KYC Events
// ============================================

export interface KYCInitiatedEvent {
  userId: UUID;
  kycId: UUID;
  provider: 'persona';
  tier: KYCTier;
}

export interface KYCCompletedEvent {
  userId: UUID;
  kycId: UUID;
  status: KYCStatus;
  tier: KYCTier;
  documentType?: string;
  documentCountry?: string;
}

export interface KYCRejectedEvent {
  userId: UUID;
  kycId: UUID;
  reason: string;
}

// ============================================
// Transfer Events
// ============================================

export interface TransferInitiatedEvent {
  transferId: UUID;
  senderId: UUID;
  recipientPhone: PhoneNumber;
  amount: Decimal;
  currency: Currency;
  note?: string;
}

export interface TransferConfirmedEvent {
  transferId: UUID;
  chain: Chain;
  txHash: string;
  confirmedAt: ISOTimestamp;
}

export interface TransferClaimedEvent {
  transferId: UUID;
  claimId: UUID;
  recipientPhone: PhoneNumber;
  claimedAt: ISOTimestamp;
}

export interface TransferCompletedEvent {
  transferId: UUID;
  cashoutId: UUID;
  completedAt: ISOTimestamp;
}

export interface TransferCancelledEvent {
  transferId: UUID;
  reason: 'user_cancelled' | 'expired' | 'failed';
  cancelledAt: ISOTimestamp;
}

export interface TransferFailedEvent {
  transferId: UUID;
  reason: string;
  failedAt: ISOTimestamp;
}

// ============================================
// Wallet Events
// ============================================

export interface WalletCreatedEvent {
  walletId: UUID;
  userId: UUID;
  address: string;
  chain: Chain;
}

export interface BalanceDebitedEvent {
  walletId: UUID;
  userId: UUID;
  transferId: UUID;
  amount: Decimal;
  currency: Currency;
  newBalance: Decimal;
}

export interface BalanceCreditedEvent {
  walletId: UUID;
  userId: UUID;
  transferId?: UUID;
  source: 'deposit' | 'refund' | 'receive';
  amount: Decimal;
  currency: Currency;
  newBalance: Decimal;
}

export interface BalanceRefundedEvent {
  walletId: UUID;
  userId: UUID;
  transferId: UUID;
  amount: Decimal;
  currency: Currency;
  reason: string;
}

// ============================================
// Ledger Events
// ============================================

export interface LedgerEntryCreatedEvent {
  entryId: UUID;
  transactionId: UUID;
  accountId: UUID;
  entryType: 'DEBIT' | 'CREDIT';
  amount: Decimal;
  currency: Currency;
  balanceAfter: Decimal;
}

// ============================================
// Claim Events
// ============================================

export interface ClaimCreatedEvent {
  claimId: UUID;
  transferId: UUID;
  code: string;
  recipientPhone: PhoneNumber;
  amount: Decimal;
  currency: Currency;
  expiresAt: ISOTimestamp;
}

export interface ClaimVerifiedEvent {
  claimId: UUID;
  transferId: UUID;
  recipientPhone: PhoneNumber;
  verifiedAt: ISOTimestamp;
}

export interface ClaimExpiredEvent {
  claimId: UUID;
  transferId: UUID;
  expiredAt: ISOTimestamp;
}

// ============================================
// Off-ramp Events
// ============================================

export interface OfframpInitiatedEvent {
  offrampId: UUID;
  claimId: UUID;
  transferId: UUID;
  method: CashoutMethod;
  amount: Decimal;
  currency: Currency;
  localAmount: Decimal;
  localCurrency: Currency;
  accountNumber: string;
}

export interface OfframpProcessingEvent {
  offrampId: UUID;
  providerReference: string;
}

export interface OfframpCompletedEvent {
  offrampId: UUID;
  claimId: UUID;
  transferId: UUID;
  reference: string;
  completedAt: ISOTimestamp;
}

export interface OfframpFailedEvent {
  offrampId: UUID;
  claimId: UUID;
  transferId: UUID;
  reason: string;
  failedAt: ISOTimestamp;
}

// ============================================
// Notification Commands
// ============================================

export interface SendNotificationCommand {
  notificationId: UUID;
  userId?: UUID;
  phone: PhoneNumber;
  channel: NotificationChannel;
  type: NotificationType;
  payload: Record<string, unknown>;
}

export interface NotificationSentEvent {
  notificationId: UUID;
  channel: NotificationChannel;
  providerMessageId?: string;
  sentAt: ISOTimestamp;
}

export interface NotificationDeliveredEvent {
  notificationId: UUID;
  deliveredAt: ISOTimestamp;
}

export interface NotificationFailedEvent {
  notificationId: UUID;
  reason: string;
  failedAt: ISOTimestamp;
}

// ============================================
// Event Type Union
// ============================================

export type DomainEvent =
  // Auth
  | CloudEvent<OTPRequestedEvent>
  | CloudEvent<OTPVerifiedEvent>
  | CloudEvent<SessionCreatedEvent>
  | CloudEvent<SessionRevokedEvent>
  // User
  | CloudEvent<UserCreatedEvent>
  | CloudEvent<UserUpdatedEvent>
  | CloudEvent<ContactsSyncedEvent>
  // KYC
  | CloudEvent<KYCInitiatedEvent>
  | CloudEvent<KYCCompletedEvent>
  | CloudEvent<KYCRejectedEvent>
  // Transfer
  | CloudEvent<TransferInitiatedEvent>
  | CloudEvent<TransferConfirmedEvent>
  | CloudEvent<TransferClaimedEvent>
  | CloudEvent<TransferCompletedEvent>
  | CloudEvent<TransferCancelledEvent>
  | CloudEvent<TransferFailedEvent>
  // Wallet
  | CloudEvent<WalletCreatedEvent>
  | CloudEvent<BalanceDebitedEvent>
  | CloudEvent<BalanceCreditedEvent>
  | CloudEvent<BalanceRefundedEvent>
  // Ledger
  | CloudEvent<LedgerEntryCreatedEvent>
  // Claim
  | CloudEvent<ClaimCreatedEvent>
  | CloudEvent<ClaimVerifiedEvent>
  | CloudEvent<ClaimExpiredEvent>
  // Offramp
  | CloudEvent<OfframpInitiatedEvent>
  | CloudEvent<OfframpProcessingEvent>
  | CloudEvent<OfframpCompletedEvent>
  | CloudEvent<OfframpFailedEvent>
  // Notification
  | CloudEvent<SendNotificationCommand>
  | CloudEvent<NotificationSentEvent>
  | CloudEvent<NotificationDeliveredEvent>
  | CloudEvent<NotificationFailedEvent>;

// ============================================
// Event Type Constants
// ============================================

export const EventTypes = {
  // Auth
  OTP_REQUESTED: 'com.cash.auth.otp_requested',
  OTP_VERIFIED: 'com.cash.auth.otp_verified',
  SESSION_CREATED: 'com.cash.auth.session_created',
  SESSION_REVOKED: 'com.cash.auth.session_revoked',

  // User
  USER_CREATED: 'com.cash.user.created',
  USER_UPDATED: 'com.cash.user.updated',
  CONTACTS_SYNCED: 'com.cash.user.contacts_synced',

  // KYC
  KYC_INITIATED: 'com.cash.kyc.initiated',
  KYC_COMPLETED: 'com.cash.kyc.completed',
  KYC_REJECTED: 'com.cash.kyc.rejected',

  // Transfer
  TRANSFER_INITIATED: 'com.cash.transfer.initiated',
  TRANSFER_CONFIRMED: 'com.cash.transfer.confirmed',
  TRANSFER_CLAIMED: 'com.cash.transfer.claimed',
  TRANSFER_COMPLETED: 'com.cash.transfer.completed',
  TRANSFER_CANCELLED: 'com.cash.transfer.cancelled',
  TRANSFER_FAILED: 'com.cash.transfer.failed',

  // Wallet
  WALLET_CREATED: 'com.cash.wallet.created',
  BALANCE_DEBITED: 'com.cash.wallet.balance_debited',
  BALANCE_CREDITED: 'com.cash.wallet.balance_credited',
  BALANCE_REFUNDED: 'com.cash.wallet.balance_refunded',

  // Ledger
  LEDGER_ENTRY_CREATED: 'com.cash.ledger.entry_created',

  // Claim
  CLAIM_CREATED: 'com.cash.claim.created',
  CLAIM_VERIFIED: 'com.cash.claim.verified',
  CLAIM_EXPIRED: 'com.cash.claim.expired',

  // Offramp
  OFFRAMP_INITIATED: 'com.cash.offramp.initiated',
  OFFRAMP_PROCESSING: 'com.cash.offramp.processing',
  OFFRAMP_COMPLETED: 'com.cash.offramp.completed',
  OFFRAMP_FAILED: 'com.cash.offramp.failed',

  // Notification
  SEND_NOTIFICATION: 'com.cash.notify.send',
  NOTIFICATION_SENT: 'com.cash.notify.sent',
  NOTIFICATION_DELIVERED: 'com.cash.notify.delivered',
  NOTIFICATION_FAILED: 'com.cash.notify.failed',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
