/**
 * Outbox publisher — background process that drains the outbox table to Redpanda.
 *
 * Per ARCHITECTURE.md § Outbox Pattern (Pattern #5):
 *   This solves the dual-write problem: we never publish to Kafka without
 *   the DB transaction succeeding, and we never have a DB write without
 *   the corresponding event eventually being published.
 *
 * Runs as a polling loop, drains a batch every 5 seconds. In production,
 * runs in the same container as ledger-service (single-instance for safety,
 * with at-least-once delivery semantics on the Kafka side).
 */
import { Kafka, type Producer } from 'kafkajs';
import { loadConfig } from '@ping/config';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

const config = loadConfig();

const BATCH_SIZE = 100;
const POLL_INTERVAL_MS = 5_000;
const MAX_RETRIES = 5;

let kafkaProducer: Producer | null = null;
let pollerHandle: NodeJS.Timeout | null = null;

async function getProducer(): Promise<Producer | null> {
  if (kafkaProducer) return kafkaProducer;
  if (!config.KAFKA_BROKERS) {
    logger.warn('No KAFKA_BROKERS configured — outbox publisher in stub mode');
    return null;
  }
  const kafka = new Kafka({
    clientId: config.KAFKA_CLIENT_ID ?? 'ledger-service',
    brokers: config.KAFKA_BROKERS,
  });
  kafkaProducer = kafka.producer({ idempotent: true });
  await kafkaProducer.connect();
  logger.info('Kafka producer connected');
  return kafkaProducer;
}

async function drainBatch(): Promise<void> {
  const producer = await getProducer();

  const candidates = await prisma.outboxEvent.findMany({
    where: {
      published: false,
      retryCount: { lt: MAX_RETRIES },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
    },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  });

  if (candidates.length === 0) return;

  logger.info({ count: candidates.length }, 'Draining outbox batch');

  for (const event of candidates) {
    try {
      if (producer) {
        await producer.send({
          topic: event.topic,
          messages: [
            {
              key: event.correlationId ?? event.id,
              value: JSON.stringify({
                specversion: '1.0',
                type: event.eventType,
                source: '/services/ledger',
                id: event.id,
                time: event.createdAt.toISOString(),
                datacontenttype: 'application/json',
                correlationid: event.correlationId,
                causationid: event.causationId,
                data: event.payload,
              }),
            },
          ],
        });
      } else {
        logger.info(
          { eventId: event.id, topic: event.topic },
          '[STUB] Would publish event to Kafka',
        );
      }

      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          published: true,
          publishedAt: new Date(),
        },
      });
    } catch (err) {
      const retryCount = event.retryCount + 1;
      const backoffSeconds = Math.min(300, 2 ** retryCount); // exponential backoff capped at 5min
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          retryCount,
          lastError: (err as Error).message,
          nextRetryAt: new Date(Date.now() + backoffSeconds * 1000),
        },
      });
      logger.warn(
        { eventId: event.id, retryCount, backoffSeconds, err },
        'Outbox publish failed — backing off',
      );
    }
  }
}

export function startPolling(): void {
  if (pollerHandle) return;
  logger.info({ intervalMs: POLL_INTERVAL_MS, batchSize: BATCH_SIZE }, 'Starting outbox poller');
  const tick = async () => {
    try {
      await drainBatch();
    } catch (err) {
      logger.error({ err }, 'Outbox poll iteration failed');
    } finally {
      pollerHandle = setTimeout(tick, POLL_INTERVAL_MS);
    }
  };
  pollerHandle = setTimeout(tick, POLL_INTERVAL_MS);
}

export function stopPolling(): void {
  if (pollerHandle) {
    clearTimeout(pollerHandle);
    pollerHandle = null;
  }
}

export async function shutdown(): Promise<void> {
  stopPolling();
  if (kafkaProducer) {
    await kafkaProducer.disconnect();
    kafkaProducer = null;
  }
}
