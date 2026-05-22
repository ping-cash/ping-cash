import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export function errorHandler(
  error: Error | FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  request.log.error({ err: error }, 'Request error');
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
    error: { code: 'INTERNAL_ERROR', message: error.message ?? 'Unknown', requestId: request.id },
  });
}
