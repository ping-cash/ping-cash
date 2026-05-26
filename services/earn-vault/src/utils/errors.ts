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

export const VaultErrors = {
  UserNotFound: (userId: string) =>
    new AppError('USER_NOT_FOUND', `User ${userId} not found.`, 404),
  ProgramUnreachable: () =>
    new AppError(
      'PROGRAM_UNREACHABLE',
      'On-chain earn-vault program unreachable.',
      503
    ),
  StakeFailed: (details?: Record<string, unknown>) =>
    new AppError('STAKE_FAILED', 'Stake transaction failed.', 502, details),
  UnstakeFailed: (details?: Record<string, unknown>) =>
    new AppError(
      'UNSTAKE_FAILED',
      'Unstake transaction failed.',
      502,
      details
    ),
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
      message: error.message ?? 'Unknown',
      requestId: request.id,
    },
  });
}
