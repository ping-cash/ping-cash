import pino from 'pino';
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'earn-vault-service' },
  timestamp: pino.stdTimeFunctions.isoTime,
});
