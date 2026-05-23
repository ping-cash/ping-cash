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

export const ClaimErrors = {
  ClaimNotFound: () =>
    new AppError('CLAIM_NOT_FOUND', 'Claim not found or expired.', 404),
  ClaimExpired: () =>
    new AppError('CLAIM_EXPIRED', 'Claim link has expired.', 400),
  ClaimAlreadyUsed: () =>
    new AppError(
      'CLAIM_ALREADY_USED',
      'Claim has already been processed.',
      400
    ),
  InvalidOtp: () =>
    new AppError('INVALID_OTP', 'Invalid verification code.', 400),
  MaxAttempts: () =>
    new AppError(
      'MAX_ATTEMPTS',
      'Maximum verification attempts exceeded.',
      429
    ),
  RateLimited: () => new AppError('RATE_LIMITED', 'Too many requests.', 429),
  TwilioFailure: (details?: Record<string, unknown>) =>
    new AppError('TWILIO_FAILURE', 'Failed to send OTP.', 502, details),
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
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: error.message ?? 'Unknown error',
      requestId: request.id,
    },
  });
}
