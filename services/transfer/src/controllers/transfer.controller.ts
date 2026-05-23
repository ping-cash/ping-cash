import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { CreateTransferRequest, PaginationParams } from '@ping/types';
import { TransferService } from '../services/transfer.service';
import { AppError } from '../utils/errors';

// Request schemas
const createTransferSchema = z.object({
  recipientPhone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Invalid phone number'),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  currency: z.enum(['USD', 'PHP', 'INR', 'PKR', 'KES', 'NGN', 'AED', 'SAR', 'GBP', 'EUR']),
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
  }>('/', {
    schema: {
      body: createTransferSchema,
    },
    preHandler: [authenticate],
  }, async (request, reply) => {
    const userId = (request as any).userId as string;
    const body = request.body;

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
  });

  // Get transfer by ID
  app.get<{
    Params: { id: string };
  }>('/:id', {
    preHandler: [authenticate],
  }, async (request, reply) => {
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
  });

  // List transfers
  app.get<{
    Querystring: PaginationParams & { type?: 'sent' | 'received'; status?: string };
  }>('/', {
    schema: {
      querystring: listTransfersSchema,
    },
    preHandler: [authenticate],
  }, async (request, reply) => {
    const userId = (request as any).userId as string;
    const { type, status, limit, cursor } = request.query;

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
  });

  // Cancel transfer
  app.post<{
    Params: { id: string };
  }>('/:id/cancel', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const userId = (request as any).userId as string;
    const { id } = request.params;

    const transfer = await transferService.cancelTransfer(id, userId);

    reply.send({
      success: true,
      data: { transfer },
    });
  });
}

// Authentication middleware (placeholder - implement JWT validation)
async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Missing or invalid authorization header', 401);
  }

  // _token would be the bearer token; left commented until JWT verification ships
  // const _token = authHeader.slice(7);

  // TODO: Validate JWT and extract user ID
  // For now, this is a placeholder
  try {
    // const payload = await verifyJwt(token);
    // (request as any).userId = payload.userId;

    // Placeholder for development
    (request as any).userId = 'usr_development';
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid token', 401);
  }
}
