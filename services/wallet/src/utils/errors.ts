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

export const WalletErrors = {
  Unauthorized: () => new AppError('UNAUTHORIZED', 'Authentication required.', 401),
  WalletNotFound: () => new AppError('WALLET_NOT_FOUND', 'Wallet not found.', 404),
  SolanaRpcError: (details?: Record<string, unknown>) =>
    new AppError('SOLANA_RPC_ERROR', 'Failed to query Solana RPC.', 502, details),
  InvalidAddress: () => new AppError('INVALID_ADDRESS', 'Invalid Solana address.', 400),
  InsufficientBalance: (details?: Record<string, unknown>) =>
    new AppError('INSUFFICIENT_BALANCE', 'Insufficient balance.', 400, details),
  PrivyFailure: (details?: Record<string, unknown>) =>
    new AppError('PRIVY_FAILURE', 'Privy operation failed.', 502, details),
  VaultError: (details?: Record<string, unknown>) =>
    new AppError('VAULT_ERROR', 'Earn Vault operation failed.', 502, details),
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
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', requestId: request.id },
  });
}
