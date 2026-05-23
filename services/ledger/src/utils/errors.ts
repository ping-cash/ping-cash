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

export const LedgerErrors = {
  Unauthorized: () =>
    new AppError('UNAUTHORIZED', 'Authentication required.', 401),
  ImbalancedTransaction: (details: Record<string, unknown>) =>
    new AppError(
      'IMBALANCED_TRANSACTION',
      'Ledger entries do not balance — debits must equal credits per transaction.',
      400,
      details
    ),
  InsufficientFunds: (details?: Record<string, unknown>) =>
    new AppError(
      'INSUFFICIENT_FUNDS',
      'Insufficient account balance.',
      400,
      details
    ),
  AccountNotFound: () =>
    new AppError('ACCOUNT_NOT_FOUND', 'Account not found.', 404),
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
      message: 'An unexpected error occurred.',
      requestId: request.id,
    },
  });
}
