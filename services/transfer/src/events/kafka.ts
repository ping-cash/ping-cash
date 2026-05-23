import { getConfig } from '@ping/config';
import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';

import { logger } from '../utils/logger';

const config = getConfig();

export const kafka = new Kafka({
  clientId: config.KAFKA_CLIENT_ID,
  brokers: config.KAFKA_BROKERS ?? [],
  logLevel: logLevel.WARN,
  logCreator: () => {
    return ({ level, log }) => {
      const { message, ...extra } = log;
      switch (level) {
        case logLevel.ERROR:
          logger.error(extra, message);
          break;
        case logLevel.WARN:
          logger.warn(extra, message);
          break;
        case logLevel.INFO:
          logger.info(extra, message);
          break;
        case logLevel.DEBUG:
          logger.debug(extra, message);
          break;
      }
    };
  },
});

let producer: Producer;
let consumer: Consumer;

export async function connectKafka(): Promise<void> {
  if (!config.KAFKA_BROKERS || config.KAFKA_BROKERS.length === 0) {
    logger.warn(
      'KAFKA_BROKERS unset — running in stub mode; transfer events will be logged only'
    );
    return;
  }
  // Connect producer
  producer = kafka.producer({
    allowAutoTopicCreation: true,
    idempotent: true,
  });
  await producer.connect();
  logger.info('Kafka producer connected');

  // Connect consumer (if this service consumes events)
  if (config.KAFKA_GROUP_ID) {
    consumer = kafka.consumer({
      groupId: config.KAFKA_GROUP_ID,
    });
    await consumer.connect();
    logger.info({ groupId: config.KAFKA_GROUP_ID }, 'Kafka consumer connected');
  }
}

export async function disconnectKafka(): Promise<void> {
  await producer?.disconnect();
  await consumer?.disconnect();
  logger.info('Kafka disconnected');
}

export function getProducer(): Producer | null {
  return producer ?? null;
}

export function isKafkaEnabled(): boolean {
  return Boolean(producer);
}

export function getConsumer(): Consumer {
  if (!consumer) {
    throw new Error('Kafka consumer not initialized');
  }
  return consumer;
}

export { producer, consumer };
