import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from './logger';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log the error
  logger.error({
    err: error,
    requestId: request.id,
    method: request.method,
    url: request.url,
  }, 'Request error');

  // Handle known AppErrors
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  // Handle Fastify validation errors
  if ('validation' in error && error.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          errors: error.validation,
        },
      },
    });
  }

  // Handle rate limit errors
  if ('statusCode' in error && (error as { statusCode?: number }).statusCode === 429) {
    return reply.status(429).send({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
      },
    });
  }

  // Handle unknown errors
  const statusCode = 'statusCode' in error ? error.statusCode : 500;

  return reply.status(statusCode || 500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message,
    },
  });
}

// Common error codes
export const ErrorCodes = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_AMOUNT: 'INVALID_AMOUNT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  TRANSFER_NOT_FOUND: 'TRANSFER_NOT_FOUND',
  CLAIM_NOT_FOUND: 'CLAIM_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // Business logic
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  INVALID_STATUS: 'INVALID_STATUS',
  CLAIM_EXPIRED: 'CLAIM_EXPIRED',

  // External services
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
} as const;
