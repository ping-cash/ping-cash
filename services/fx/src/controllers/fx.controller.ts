import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getQuote, getRate, FX_SPREAD } from '../services/quote.service';
import { getPythRate } from '../services/oracle.service';

const QuoteBody = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
  fromCurrency: z.string().min(3).max(3),
  toCurrency: z.string().min(3).max(3),
});

export async function fxRoutes(fastify: FastifyInstance) {
  // GET /fx/rates?base=USD — return live rates for common currencies
  fastify.get('/rates', async (request: FastifyRequest, reply: FastifyReply) => {
    const { base } = request.query as { base?: string };
    const baseCurrency = (base ?? 'USD').toUpperCase();

    if (baseCurrency !== 'USD') {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Only USD base supported in Phase 1' },
      });
    }

    const currencies = ['PHP', 'INR', 'PKR', 'BDT', 'KES', 'NGN', 'EUR', 'GBP', 'AED', 'TRY'];
    const rates: Record<string, number> = {};

    await Promise.all(
      currencies.map(async (c) => {
        try {
          const q = await getPythRate(c);
          rates[c] = q.rate;
        } catch {
          // Skip unavailable feeds
        }
      }),
    );

    return reply.status(200).send({
      base: baseCurrency,
      rates,
      spread: FX_SPREAD,
      updatedAt: new Date().toISOString(),
      validForSeconds: 60,
      note: 'Live rates are the interbank mid; Ping applies 0.4% spread on conversions (per ADR 0016)',
    });
  });

  // POST /fx/quote — get a quote for a specific conversion
  fastify.post('/quote', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = QuoteBody.parse(request.body);
    const quote = await getQuote(body.amount, body.fromCurrency, body.toCurrency);
    return reply.status(200).send(quote);
  });

  // GET /fx/rate?from=USD&to=PHP — get raw rate (internal use)
  fastify.get('/rate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    if (!from || !to) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'from and to query params required' },
      });
    }
    const rate = await getRate(from, to);
    return reply.status(200).send({ from: from.toUpperCase(), to: to.toUpperCase(), rate });
  });
}
