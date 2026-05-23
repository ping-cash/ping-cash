import { FastifyInstance } from 'fastify';

import { kafka } from '../events/kafka';
import { prisma } from '../utils/prisma';
import { redis } from '../utils/redis';

export async function healthRoutes(app: FastifyInstance) {
  // Liveness probe
  app.get('/live', async (_request, reply) => {
    reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Readiness probe
  app.get('/ready', async (_request, reply) => {
    const checks: Record<string, boolean> = {};

    // Check PostgreSQL
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.postgres = true;
    } catch {
      checks.postgres = false;
    }

    // Check Redis
    try {
      await redis.ping();
      checks.redis = true;
    } catch {
      checks.redis = false;
    }

    // Check Kafka
    try {
      const admin = kafka.admin();
      await admin.connect();
      await admin.disconnect();
      checks.kafka = true;
    } catch {
      checks.kafka = false;
    }

    const allHealthy = Object.values(checks).every(Boolean);

    reply.status(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    });
  });

  // Detailed health check
  app.get('/', async (_request, reply) => {
    reply.send({
      service: 'transfer-service',
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });
}
