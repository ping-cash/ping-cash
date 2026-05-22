import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const UserErrors = {
  NotFound: () => new AppError('USER_NOT_FOUND', 'User not found.', 404),
  Unauthorized: () => new AppError('UNAUTHORIZED', 'Authentication required.', 401),
  Forbidden: () => new AppError('FORBIDDEN', 'Insufficient permissions.', 403),
  ValidationError: (details?: Record<string, unknown>) =>
    new AppError('VALIDATION_ERROR', 'Invalid request.', 400, details),
  WelcomeStakeAlreadyGranted: () =>
    new AppError('WELCOME_STAKE_ALREADY_GRANTED', 'Welcome stake has already been granted to this user.', 409),
  KycTierInsufficient: () =>
    new AppError('KYC_TIER_INSUFFICIENT', 'KYC tier insufficient for this action.', 403),
  DailyLimitExceeded: (details?: Record<string, unknown>) =>
    new AppError('DAILY_LIMIT_EXCEEDED', 'Daily transfer limit exceeded.', 400, details),
  MonthlyLimitExceeded: (details?: Record<string, unknown>) =>
    new AppError('MONTHLY_LIMIT_EXCEEDED', 'Monthly transfer limit exceeded.', 400, details),
};

export function errorHandler(
  error: Error | FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply,
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
      message: 'An unexpected error occurred.',
      requestId: request.id,
    },
  });
}
