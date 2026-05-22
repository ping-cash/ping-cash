import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { dispatch } from '../services/dispatch.service';
import { listTemplates } from '../services/templates.service';

const DispatchBody = z.object({
  recipientPhone: z.string().regex(/^\+[1-9]\d{6,14}$/).optional(),
  deviceToken: z.string().optional(),
  template: z.string().min(1),
  params: z.record(z.string()),
  channels: z.array(z.enum(['whatsapp', 'sms', 'push'])).optional(),
});

export async function notifyRoutes(fastify: FastifyInstance) {
  // POST /notify/dispatch — multi-channel send
  fastify.post('/dispatch', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = DispatchBody.parse(request.body);
    const result = await dispatch(body as never);
    return reply.status(200).send(result);
  });

  // GET /notify/templates — list available templates
  fastify.get('/templates', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({ templates: listTemplates() });
  });
}
