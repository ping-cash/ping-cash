import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Common errors specific to auth-service
export const AuthErrors = {
  RateLimited: () =>
    new AppError(
      'RATE_LIMITED',
      'Too many requests. Please try again later.',
      429
    ),
  InvalidPhone: () =>
    new AppError('INVALID_PHONE', 'Invalid phone number format.', 400),
  TwilioFailure: (details?: Record<string, unknown>) =>
    new AppError('TWILIO_FAILURE', 'Failed to send OTP.', 502, details),
  SessionNotFound: () =>
    new AppError('SESSION_NOT_FOUND', 'OTP session not found or expired.', 404),
  InvalidOtp: () =>
    new AppError('INVALID_OTP', 'Invalid verification code.', 400),
  OtpExpired: () =>
    new AppError('OTP_EXPIRED', 'Verification code has expired.', 400),
  MaxAttempts: () =>
    new AppError(
      'MAX_ATTEMPTS',
      'Maximum verification attempts exceeded.',
      429
    ),
  PrivyFailure: (details?: Record<string, unknown>) =>
    new AppError('PRIVY_FAILURE', 'Failed to create wallet.', 502, details),
  InvalidRefreshToken: () =>
    new AppError(
      'INVALID_REFRESH_TOKEN',
      'Invalid or expired refresh token.',
      401
    ),
  Unauthorized: () =>
    new AppError('UNAUTHORIZED', 'Authentication required.', 401),
};

export function errorHandler(
  error: Error | FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error({ err: error, url: request.url }, 'Request error');

  if (error instanceof AppError) {
    return reply.status(error.status).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: request.id,
      },
    });
  }

  // Fastify built-in validation errors
  if ('validation' in error && error.validation) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: { validation: error.validation },
        requestId: request.id,
      },
    });
  }

  // Default — internal server error
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
      requestId: request.id,
    },
  });
}
