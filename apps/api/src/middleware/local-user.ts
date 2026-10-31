import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db';
import { log } from '../lib/logger';

/**
 * Single-user mode.
 *
 * There is no sign-in. Every request runs as one local user whose row exists
 * only so watches and notifications have something to reference. The address
 * alerts go to comes from NOTIFY_EMAIL.
 */
export const LOCAL_USER_ID = 'local';

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
}

export interface LocalUser {
  id: string;
  email: string;
  displayName: string | null;
}

function notifyEmail(): string {
  return (process.env.NOTIFY_EMAIL || '').trim();
}

/**
 * Create the local user on first boot and keep its email in sync with
 * NOTIFY_EMAIL on later boots. Call once after migrations.
 */
export function ensureLocalUser(): LocalUser {
  const email = notifyEmail();

  const existing = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, LOCAL_USER_ID))
    .get();

  if (!existing) {
    db.insert(schema.users)
      .values({ id: LOCAL_USER_ID, email, displayName: null })
      .run();
    log.auth.info({ email }, 'Created local user');
  } else if (existing.email !== email) {
    db.update(schema.users)
      .set({ email, updatedAt: new Date().toISOString() })
      .where(eq(schema.users.id, LOCAL_USER_ID))
      .run();
    log.auth.info({ email }, 'Updated local user email from NOTIFY_EMAIL');
  }

  if (!email) {
    log.auth.warn(
      'NOTIFY_EMAIL is not set; availability alerts will be skipped',
    );
  }

  return getLocalUser();
}

export function getLocalUser(): LocalUser {
  const row = db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
    })
    .from(schema.users)
    .where(eq(schema.users.id, LOCAL_USER_ID))
    .get();

  return row ?? { id: LOCAL_USER_ID, email: notifyEmail(), displayName: null };
}

/**
 * Attach the local user to the request so route handlers can keep treating
 * `userId` / `userEmail` as they always did.
 */
export function localUserMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  (req as AuthenticatedRequest).userId = LOCAL_USER_ID;
  (req as AuthenticatedRequest).userEmail = notifyEmail();
  next();
}
