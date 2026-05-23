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

export const OfframpErrors = {
  ProviderUnavailable: (provider: string) =>
    new AppError(
      'PROVIDER_UNAVAILABLE',
      `Provider ${provider} unavailable.`,
      503
    ),
  AllProvidersFailed: () =>
    new AppError(
      'ALL_PROVIDERS_FAILED',
      'All off-ramp providers are unavailable.',
      503
    ),
  InvalidMethod: () =>
    new AppError('INVALID_METHOD', 'Invalid cash-out method.', 400),
  InvalidWebhookSignature: () =>
    new AppError(
      'INVALID_WEBHOOK_SIGNATURE',
      'Webhook signature verification failed.',
      401
    ),
  PayoutFailed: (details?: Record<string, unknown>) =>
    new AppError('PAYOUT_FAILED', 'Provider payout failed.', 502, details),
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
      message: 'Unknown error',
      requestId: request.id,
    },
  });
}
