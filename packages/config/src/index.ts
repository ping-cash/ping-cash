import { z } from 'zod';

// ============================================
// Environment Schema
// ============================================

const envSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),

  // Database
  POSTGRES_URL: z.string().url().optional(),
  MONGODB_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // Kafka
  KAFKA_BROKERS: z.string().transform(s => s.split(',')).optional(),
  KAFKA_CLIENT_ID: z.string().default('cash-platform'),
  KAFKA_GROUP_ID: z.string().optional(),

  // Privy
  PRIVY_APP_ID: z.string().optional(),
  PRIVY_APP_SECRET: z.string().optional(),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SID: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  // WhatsApp
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),

  // TransFi
  TRANSFI_API_KEY: z.string().optional(),
  TRANSFI_API_SECRET: z.string().optional(),
  TRANSFI_WEBHOOK_SECRET: z.string().optional(),

  // Wise
  WISE_API_KEY: z.string().optional(),
  WISE_WEBHOOK_SECRET: z.string().optional(),

  // Chainalysis (sanctions / KYT)
  CHAINALYSIS_API_KEY: z.string().optional(),

  // Pyth (FX oracle)
  PYTH_HERMES_URL: z.string().url().default('https://hermes.pyth.network'),

  // $PING + Earn Vault mints (Phase 2)
  PING_TOKEN_MINT: z.string().optional(),
  V_USDC_MINT: z.string().optional(),

  // Claim URL base (used by claim-service)
  CLAIM_URL_BASE: z.string().url().default('https://ping.cash/c'),

  // MoonPay
  MOONPAY_API_KEY: z.string().optional(),
  MOONPAY_SECRET_KEY: z.string().optional(),
  MOONPAY_WEBHOOK_SECRET: z.string().optional(),

  // Persona
  PERSONA_API_KEY: z.string().optional(),
  PERSONA_TEMPLATE_ID: z.string().optional(),
  PERSONA_WEBHOOK_SECRET: z.string().optional(),

  // Blockchain
  SOLANA_RPC_URL: z.string().url().default('https://api.mainnet-beta.solana.com'),
  SOLANA_USDC_MINT: z.string().default('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),

  // JWT
  JWT_SECRET: z.string().min(32).default('dev-only-secret-32-characters-minimum-length-for-hs256'),
  JWT_ACCESS_TOKEN_TTL: z.string().default('15m'),
  JWT_REFRESH_TOKEN_TTL: z.string().default('7d'),

  // API
  API_PORT: z.string().transform(Number).default('3000'),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),

  // URLs
  WEB_URL: z.string().url().default('http://localhost:3001'),
  CLAIM_URL: z.string().url().default('http://localhost:3001/c'),

  // Observability
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),

  // Feature Flags
  FEATURE_MULTI_CHAIN: z.string().transform(s => s === 'true').default('false'),
  FEATURE_BANK_OFFRAMP: z.string().transform(s => s === 'true').default('false'),
  FEATURE_RECURRING_TRANSFERS: z.string().transform(s => s === 'true').default('false'),
});

export type Env = z.infer<typeof envSchema>;

// ============================================
// Config Loader
// ============================================

let cachedConfig: Env | null = null;

export function loadConfig(): Env {
  if (cachedConfig) {
    return cachedConfig;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment configuration:');
    console.error(result.error.format());
    throw new Error('Invalid environment configuration');
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export function getConfig(): Env {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}

// ============================================
// Service-Specific Config Schemas
// ============================================

export const authConfigSchema = envSchema.pick({
  NODE_ENV: true,
  REDIS_URL: true,
  KAFKA_BROKERS: true,
  KAFKA_CLIENT_ID: true,
  PRIVY_APP_ID: true,
  PRIVY_APP_SECRET: true,
  TWILIO_ACCOUNT_SID: true,
  TWILIO_AUTH_TOKEN: true,
  TWILIO_VERIFY_SID: true,
  JWT_SECRET: true,
  JWT_ACCESS_TOKEN_TTL: true,
  JWT_REFRESH_TOKEN_TTL: true,
  API_PORT: true,
  LOG_LEVEL: true,
});

export const transferConfigSchema = envSchema.pick({
  NODE_ENV: true,
  POSTGRES_URL: true,
  REDIS_URL: true,
  KAFKA_BROKERS: true,
  KAFKA_CLIENT_ID: true,
  KAFKA_GROUP_ID: true,
  PRIVY_APP_ID: true,
  PRIVY_APP_SECRET: true,
  SOLANA_RPC_URL: true,
  SOLANA_USDC_MINT: true,
  CLAIM_URL: true,
  API_PORT: true,
  LOG_LEVEL: true,
});

export const claimConfigSchema = envSchema.pick({
  NODE_ENV: true,
  MONGODB_URL: true,
  REDIS_URL: true,
  KAFKA_BROKERS: true,
  KAFKA_CLIENT_ID: true,
  KAFKA_GROUP_ID: true,
  TWILIO_ACCOUNT_SID: true,
  TWILIO_AUTH_TOKEN: true,
  TWILIO_VERIFY_SID: true,
  TRANSFI_API_KEY: true,
  TRANSFI_WEBHOOK_SECRET: true,
  API_PORT: true,
  LOG_LEVEL: true,
});

// ============================================
// Constants
// ============================================

export const constants = {
  // Claim
  CLAIM_CODE_LENGTH: 12,
  CLAIM_EXPIRY_DAYS: 7,
  CLAIM_MAX_OTP_ATTEMPTS: 5,

  // OTP
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,

  // Rate Limits
  RATE_LIMIT_AUTH_INIT: { points: 3, duration: 600 }, // 3 per 10 min
  RATE_LIMIT_AUTH_VERIFY: { points: 5, duration: 600 }, // 5 per 10 min
  RATE_LIMIT_TRANSFER: { points: 20, duration: 3600 }, // 20 per hour
  RATE_LIMIT_CLAIM: { points: 10, duration: 3600 }, // 10 per hour

  // Limits
  MIN_TRANSFER_AMOUNT: '1.00',
  MAX_TRANSFER_AMOUNT_TIER_0: '0', // Cannot send at tier 0
  MAX_TRANSFER_AMOUNT_TIER_1: '500.00',
  MAX_TRANSFER_AMOUNT_TIER_2: '5000.00',
  MAX_TRANSFER_AMOUNT_TIER_3: '50000.00',

  // Fees
  PLATFORM_FEE_PERCENT: 0.5, // 0.5%

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ============================================
// Feature Flags
// ============================================

export function isFeatureEnabled(feature: keyof Pick<Env, 'FEATURE_MULTI_CHAIN' | 'FEATURE_BANK_OFFRAMP' | 'FEATURE_RECURRING_TRANSFERS'>): boolean {
  const config = getConfig();
  return config[feature];
}

// ============================================
// Exports
// ============================================

export { envSchema };
export type { z };
