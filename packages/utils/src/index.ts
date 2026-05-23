import { createHash } from 'crypto';

import { customAlphabet, nanoid } from 'nanoid';

// ============================================
// ID Generation
// ============================================

const prefixedId = (prefix: string) => `${prefix}_${nanoid(21)}`;

export const generateId = {
  user: () => prefixedId('usr'),
  wallet: () => prefixedId('wal'),
  transfer: () => prefixedId('txn'),
  claim: () => prefixedId('clm'),
  cashout: () => prefixedId('co'),
  notification: () => prefixedId('ntf'),
  session: () => prefixedId('ses'),
  kyc: () => prefixedId('kyc'),
  quote: () => prefixedId('qt'),
  event: () => prefixedId('evt'),
  correlation: () => prefixedId('corr'),
};

// Claim code: 12 alphanumeric characters
const claimCodeAlphabet =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const generateClaimCode = customAlphabet(claimCodeAlphabet, 12);

export { generateClaimCode };

// ============================================
// Phone Number Utilities
// ============================================

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhone(phone: string): string {
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    throw new Error('Phone number must include country code with + prefix');
  }

  return cleaned;
}

/**
 * Hash phone number for lookups (SHA-256)
 */
export function hashPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Mask phone number for display
 * +639171234567 -> +63***4567
 */
export function maskPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.length < 8) return normalized;

  const countryCode = normalized.slice(0, 3);
  const lastFour = normalized.slice(-4);
  return `${countryCode}***${lastFour}`;
}

/**
 * Validate E.164 phone number format
 */
export function isValidPhone(phone: string): boolean {
  try {
    const normalized = normalizePhone(phone);
    // E.164: + followed by 7-15 digits
    return /^\+[1-9]\d{6,14}$/.test(normalized);
  } catch {
    return false;
  }
}

// ============================================
// Currency Utilities
// ============================================

/**
 * Format amount with currency symbol
 */
export function formatCurrency(
  amount: string | number,
  currency: string
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  const symbols: Record<string, string> = {
    USD: '$',
    PHP: '₱',
    INR: '₹',
    PKR: 'Rs',
    KES: 'KSh',
    NGN: '₦',
    AED: 'AED',
    SAR: 'SAR',
    GBP: '£',
    EUR: '€',
  };

  const symbol = symbols[currency] || currency;
  return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Parse decimal string to cents/smallest unit
 */
export function toCents(amount: string, decimals = 2): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedFraction);
}

/**
 * Convert cents to decimal string
 */
export function fromCents(cents: bigint, decimals = 2): string {
  const str = cents.toString().padStart(decimals + 1, '0');
  const whole = str.slice(0, -decimals) || '0';
  const fraction = str.slice(-decimals);
  return `${whole}.${fraction}`;
}

// ============================================
// Date Utilities
// ============================================

/**
 * Get ISO timestamp
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Add duration to date
 */
export function addDuration(date: Date, duration: string): Date {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);

  const [, value, unit] = match;
  const ms = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }[unit]!;

  return new Date(date.getTime() + parseInt(value) * ms);
}

/**
 * Check if date is expired
 */
export function isExpired(expiresAt: string | Date): boolean {
  const expiry =
    typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiry.getTime() < Date.now();
}

// ============================================
// Result Type
// ============================================

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

// ============================================
// Async Utilities
// ============================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) break;

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      onRetry?.(lastError, attempt);
      await sleep(delay);
    }
  }

  throw lastError!;
}

// ============================================
// Object Utilities
// ============================================

/**
 * Remove undefined values from object
 */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

/**
 * Pick specified keys from object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  return Object.fromEntries(
    keys.filter(k => k in obj).map(k => [k, obj[k]])
  ) as Pick<T, K>;
}

/**
 * Omit specified keys from object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const keySet = new Set(keys as string[]);
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => !keySet.has(k))
  ) as Omit<T, K>;
}

// ============================================
// Validation Utilities
// ============================================

/**
 * Assert condition or throw
 */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Assert value is defined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}
