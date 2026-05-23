import type { CreateTransferRequest, PaginationParams } from '@ping/types';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { TransferService } from '../services/transfer.service';
import { AppError } from '../utils/errors';

// Request schemas
const createTransferSchema = z.object({
  recipientPhone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Invalid phone number'),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  currency: z.enum([
    'USD',
    'PHP',
    'INR',
    'PKR',
    'KES',
    'NGN',
    'AED',
    'SAR',
    'GBP',
    'EUR',
  ]),
  note: z.string().max(200).optional(),
});

const listTransfersSchema = z.object({
  type: z.enum(['sent', 'received']).optional(),
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export async function transferRoutes(app: FastifyInstance) {
  const transferService = new TransferService();

  // Create transfer
  app.post<{
    Body: CreateTransferRequest;
  }>(
    '/',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const body = createTransferSchema.parse(request.body);

      const transfer = await transferService.createTransfer({
        senderId: userId,
        recipientPhone: body.recipientPhone,
        amount: body.amount,
        currency: body.currency,
        note: body.note,
      });

      reply.status(201).send({
        success: true,
        data: { transfer },
      });
    }
  );

  // Get transfer by ID
  app.get<{
    Params: { id: string };
  }>(
    '/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const { id } = request.params;

      const transfer = await transferService.getTransfer(id, userId);

      if (!transfer) {
        throw new AppError('TRANSFER_NOT_FOUND', 'Transfer not found', 404);
      }

      reply.send({
        success: true,
        data: { transfer },
      });
    }
  );

  // List transfers
  app.get<{
    Querystring: PaginationParams & {
      type?: 'sent' | 'received';
      status?: string;
    };
  }>(
    '/',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const { type, status, limit, cursor } = listTransfersSchema.parse(
        request.query
      );

      const result = await transferService.listTransfers(userId, {
        type,
        status,
        limit,
        cursor,
      });

      reply.send({
        success: true,
        data: {
          transfers: result.transfers,
          pagination: result.pagination,
        },
      });
    }
  );

  // Cancel transfer
  app.post<{
    Params: { id: string };
  }>(
    '/:id/cancel',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const { id } = request.params;

      const transfer = await transferService.cancelTransfer(id, userId);

      reply.send({
        success: true,
        data: { transfer },
      });
    }
  );
}

// Authentication middleware — verifies access tokens issued by auth-service
// using @fastify/jwt (registered in app.ts with config.JWT_SECRET, HS256).
async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(
      'UNAUTHORIZED',
      'Missing or invalid authorization header',
      401
    );
  }

  const token = authHeader.slice(7);
  try {
    const payload = (
      request.server as {
        jwt: { verify: (t: string) => { sub: string; type?: string } };
      }
    ).jwt.verify(token);
    if (payload.type === 'refresh') {
      throw new AppError(
        'UNAUTHORIZED',
        'Refresh token cannot be used as access token',
        401
      );
    }
    (request as { userId?: string }).userId = payload.sub;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('UNAUTHORIZED', 'Invalid or expired token', 401);
  }
}
