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

export const NotifyErrors = {
  ChannelFailed: (channel: string, details?: Record<string, unknown>) =>
    new AppError(
      'CHANNEL_FAILED',
      `Notification failed on ${channel}.`,
      502,
      details
    ),
  AllChannelsFailed: () =>
    new AppError(
      'ALL_CHANNELS_FAILED',
      'All notification channels failed.',
      502
    ),
  UnknownTemplate: (template: string) =>
    new AppError('UNKNOWN_TEMPLATE', `Unknown template: ${template}`, 400),
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
