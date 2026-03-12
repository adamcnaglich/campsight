import { db, schema } from '../db';
import { log } from '../lib/logger';

interface SchedulerEventPayload {
  eventType: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export function logSchedulerEvent(payload: SchedulerEventPayload): void {
  const { eventType, message, metadata } = payload;

  try {
    db.insert(schema.schedulerEvents)
      .values({
        eventType,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .run();
  } catch (error) {
    log.scheduler.error(
      { err: error, eventType, message },
      'Failed to persist scheduler event',
    );
  }
}
