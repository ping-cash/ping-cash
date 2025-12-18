// ============================================
// Cash Platform - Shared Types
// ============================================

// ============================================
// Common Types
// ============================================

export type UUID = string;
export type PhoneNumber = string;
export type PhoneHash = string;
export type ISOTimestamp = string;
export type Decimal = string; // String representation for precision

export type Currency = 'USD' | 'PHP' | 'INR' | 'PKR' | 'KES' | 'NGN' | 'AED' | 'SAR' | 'GBP' | 'EUR';

export type Chain = 'solana' | 'tron' | 'base';

export interface Money {
  amount: Decimal;
  currency: Currency;
}

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export interface PaginationResult {
  hasMore: boolean;
  nextCursor?: string;
}

// ============================================
// User Domain
// ============================================

export type KYCStatus = 'none' | 'pending' | 'verified' | 'rejected';
export type KYCTier = 0 | 1 | 2 | 3;

export interface User {
  id: UUID;
  phone: PhoneNumber;
  phoneHash: PhoneHash;
  name?: string;
  email?: string;
  kycStatus: KYCStatus;
  kycTier: KYCTier;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface UserProfile {
  id: UUID;
  phone: PhoneNumber;
  name?: string;
  email?: string;
  avatar?: string;
  kycStatus: KYCStatus;
  kycTier: KYCTier;
  limits: UserLimits;
  createdAt: ISOTimestamp;
}

export interface UserLimits {
  dailySend: Decimal;
  dailySendRemaining: Decimal;
  monthlySend: Decimal;
  monthlySendRemaining: Decimal;
}

export interface Contact {
  name: string;
  phone: PhoneNumber;
  isRegistered: boolean;
  userId?: UUID;
}

// ============================================
// Wallet Domain
// ============================================

export interface Wallet {
  id: UUID;
  userId: UUID;
  address: string;
  chain: Chain;
  isPrimary: boolean;
  createdAt: ISOTimestamp;
}

export interface WalletBalance {
  currency: string;
  amount: Decimal;
  chain: Chain;
}

// ============================================
// Transfer Domain
// ============================================

export type TransferStatus =
  | 'pending'      // Awaiting blockchain confirmation
  | 'confirmed'    // On-chain, awaiting claim
  | 'claimed'      // Recipient verified, awaiting cash-out selection
  | 'processing'   // Cash-out in progress
  | 'completed'    // Successfully delivered
  | 'cancelled'    // Cancelled by sender
  | 'expired'      // Claim link expired
  | 'failed';      // Transaction failed

export interface Transfer {
  id: UUID;
  senderId: UUID;
  recipientPhone: PhoneNumber;
  recipientPhoneHash: PhoneHash;
  recipientUserId?: UUID;
  amount: Money;
  fees: Money;
  status: TransferStatus;
  claimCode: string;
  claimUrl: string;
  claimExpiresAt: ISOTimestamp;
  blockchain?: {
    chain: Chain;
    txHash: string;
    confirmedAt?: ISOTimestamp;
  };
  cashout?: {
    method: CashoutMethod;
    localAmount: Decimal;
    localCurrency: Currency;
    reference?: string;
    completedAt?: ISOTimestamp;
  };
  note?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface TransferSummary {
  id: UUID;
  type: 'sent' | 'received';
  recipientPhone?: PhoneNumber;
  senderPhone?: PhoneNumber;
  amount: Decimal;
  currency: Currency;
  status: TransferStatus;
  createdAt: ISOTimestamp;
}

// ============================================
// Claim Domain
// ============================================

export type ClaimStatus =
  | 'pending'      // Awaiting phone verification
  | 'verified'     // Phone verified, awaiting cash-out
  | 'processing'   // Cash-out in progress
  | 'completed'    // Successfully cashed out
  | 'expired';     // Claim expired

export interface Claim {
  id: UUID;
  code: string;
  transferId: UUID;
  recipientPhone: PhoneNumber;
  recipientPhoneHash: PhoneHash;
  status: ClaimStatus;
  amount: Money;
  senderName?: string;
  expiresAt: ISOTimestamp;
  verifiedAt?: ISOTimestamp;
  completedAt?: ISOTimestamp;
  createdAt: ISOTimestamp;
}

export interface ClaimInfo {
  code: string;
  status: ClaimStatus;
  senderName?: string;
  amount: Money;
  recipientPhoneMasked: string;
  expiresAt: ISOTimestamp;
  createdAt: ISOTimestamp;
}

// ============================================
// Cash-out Domain
// ============================================

export type CashoutMethod =
  | 'gcash'
  | 'maya'
  | 'paytm'
  | 'upi'
  | 'mpesa'
  | 'bank_ph'
  | 'bank_in'
  | 'bank_pk'
  | 'bank_ke';

export interface CashoutOption {
  method: CashoutMethod;
  name: string;
  localAmount: Decimal;
  localCurrency: Currency;
  fee: Decimal;
  eta: string;
}

export interface CashoutRequest {
  claimId: UUID;
  method: CashoutMethod;
  accountNumber: string;
  accountName: string;
}

export type CashoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Cashout {
  id: UUID;
  claimId: UUID;
  method: CashoutMethod;
  status: CashoutStatus;
  amount: Money;
  localAmount: Decimal;
  localCurrency: Currency;
  accountNumber: string;
  accountName: string;
  reference?: string;
  failureReason?: string;
  createdAt: ISOTimestamp;
  completedAt?: ISOTimestamp;
}

// ============================================
// FX Domain
// ============================================

export interface FXRate {
  from: Currency;
  to: Currency;
  rate: Decimal;
  updatedAt: ISOTimestamp;
}

export interface FXQuote {
  id: UUID;
  input: Money;
  output: Money;
  rate: Decimal;
  fees: {
    platformFee: Decimal;
    cashoutFee: Decimal;
    total: Decimal;
  };
  expiresAt: ISOTimestamp;
}

// ============================================
// Notification Domain
// ============================================

export type NotificationChannel = 'whatsapp' | 'sms' | 'push' | 'email';

export type NotificationType =
  | 'transfer_received'
  | 'transfer_claimed'
  | 'cashout_completed'
  | 'cashout_failed'
  | 'claim_reminder'
  | 'claim_expiring';

export interface Notification {
  id: UUID;
  userId?: UUID;
  phone?: PhoneNumber;
  channel: NotificationChannel;
  type: NotificationType;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  payload: Record<string, unknown>;
  sentAt?: ISOTimestamp;
  deliveredAt?: ISOTimestamp;
  createdAt: ISOTimestamp;
}

// ============================================
// Auth Domain
// ============================================

export interface Session {
  id: UUID;
  userId: UUID;
  phone: PhoneNumber;
  createdAt: ISOTimestamp;
  expiresAt: ISOTimestamp;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============================================
// KYC Domain
// ============================================

export interface KYCRecord {
  id: UUID;
  userId: UUID;
  status: KYCStatus;
  tier: KYCTier;
  provider: 'persona';
  providerId?: string;
  documentType?: string;
  documentCountry?: string;
  verifiedAt?: ISOTimestamp;
  rejectionReason?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

// ============================================
// API Types
// ============================================

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
}

// ============================================
// Request/Response Types
// ============================================

// Auth
export interface InitAuthRequest {
  phone: PhoneNumber;
}

export interface VerifyAuthRequest {
  phone: PhoneNumber;
  code: string;
}

export interface VerifyAuthResponse {
  user: UserProfile;
  wallet: Wallet;
  tokens: AuthTokens;
}

// Transfer
export interface CreateTransferRequest {
  recipientPhone: PhoneNumber;
  amount: Decimal;
  currency: Currency;
  note?: string;
}

export interface CreateTransferResponse {
  transfer: Transfer;
}

// Claim
export interface VerifyClaimRequest {
  action: 'request_otp' | 'verify_otp';
  code?: string;
}

export interface VerifyClaimResponse {
  success: boolean;
  claim?: ClaimInfo;
  verificationToken?: string;
  cashoutOptions?: CashoutOption[];
}

export interface ExecuteCashoutRequest {
  verificationToken: string;
  method: CashoutMethod;
  accountNumber: string;
  accountName: string;
}

export interface ExecuteCashoutResponse {
  cashout: Cashout;
}
