import { EventTopics, EventType, CloudEvent } from '@ping/types/events';
import { generateId, now } from '@ping/utils';

import { logger } from '../utils/logger';

import { getProducer } from './kafka';

const SERVICE_SOURCE = '/services/transfer';

export async function publishEvent<T>(
  eventType: EventType,
  data: T,
  options: {
    key?: string;
    correlationId?: string;
    causationId?: string;
  } = {}
): Promise<void> {
  const producer = getProducer();

  const event: CloudEvent<T> = {
    specversion: '1.0',
    type: eventType,
    source: SERVICE_SOURCE,
    id: generateId.event(),
    time: now(),
    datacontenttype: 'application/json',
    data,
    correlationid: options.correlationId,
    causationid: options.causationId,
  };

  // Determine topic from event type
  const topic = getTopicForEventType(eventType);

  // Stub mode: log + return
  if (!producer) {
    logger.info(
      { eventType, eventId: event.id, topic, mode: 'stub' },
      'Event would be published (Kafka unset)'
    );
    return;
  }

  try {
    await producer.send({
      topic,
      messages: [
        {
          key: options.key,
          value: JSON.stringify(event),
          headers: {
            'content-type': 'application/cloudevents+json',
            'ce-type': eventType,
            'ce-source': SERVICE_SOURCE,
            'ce-id': event.id,
          },
        },
      ],
    });

    logger.debug(
      {
        eventType,
        eventId: event.id,
        topic,
      },
      'Event published'
    );
  } catch (error) {
    logger.error(
      {
        eventType,
        topic,
        error,
      },
      'Failed to publish event'
    );
    throw error;
  }
}

function getTopicForEventType(eventType: EventType): string {
  if (eventType.includes('transfer.')) {
    return EventTopics.TRANSFER;
  }
  if (eventType.includes('wallet.')) {
    return EventTopics.WALLET;
  }
  if (eventType.includes('claim.')) {
    return EventTopics.CLAIM;
  }
  if (eventType.includes('notify.')) {
    return EventTopics.NOTIFY;
  }
  if (eventType.includes('auth.')) {
    return EventTopics.AUTH;
  }
  if (eventType.includes('user.')) {
    return EventTopics.USER;
  }
  if (eventType.includes('kyc.')) {
    return EventTopics.KYC;
  }
  if (eventType.includes('ledger.')) {
    return EventTopics.LEDGER;
  }
  if (eventType.includes('offramp.')) {
    return EventTopics.OFFRAMP;
  }

  // Default to audit for unknown events
  return EventTopics.AUDIT;
}
