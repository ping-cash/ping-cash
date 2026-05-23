import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as authService from '../services/auth.service';

const InitBody = z.object({
  phone: z.string().min(7).max(20),
  channel: z.enum(['sms']).optional().default('sms'),
});

const VerifyBody = z.object({
  sessionId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});

export async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/init — Initialize phone OTP
  fastify.post(
    '/init',
    {
      schema: {
        body: {
          type: 'object',
          required: ['phone'],
          properties: {
            phone: { type: 'string' },
            channel: { type: 'string', enum: ['sms'] },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = InitBody.parse(request.body);
      const result = await authService.init(body.phone, request.ip);
      return reply.status(200).send(result);
    },
  );

  // POST /auth/verify — Verify OTP, get JWT pair + wallet
  fastify.post(
    '/verify',
    {
      schema: {
        body: {
          type: 'object',
          required: ['sessionId', 'code'],
          properties: {
            sessionId: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = VerifyBody.parse(request.body);
      const result = await authService.verify(body.sessionId, body.code, fastify);
      return reply.status(200).send(result);
    },
  );

  // POST /auth/refresh — Refresh access token via refresh token
  fastify.post(
    '/refresh',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Bearer refresh token required' },
        });
      }
      const token = authHeader.slice(7);
      const payload = fastify.jwt.verify(token) as { sub: string; jti: string; type?: string };
      if (payload.type !== 'refresh') {
        return reply.status(401).send({
          error: { code: 'INVALID_REFRESH_TOKEN', message: 'Not a refresh token' },
        });
      }
      const result = await authService.refresh(payload, fastify);
      return reply.status(200).send(result);
    },
  );

  // POST /auth/logout — Revoke refresh token
  fastify.post(
    '/logout',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Bearer refresh token required' },
        });
      }
      const token = authHeader.slice(7);
      const payload = fastify.jwt.verify(token) as { jti: string };
      await authService.logout(payload.jti);
      return reply.status(204).send();
    },
  );
}
