import { randomBytes } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { firebaseAuth } from '../config/firebase';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { log } from '../lib/logger';
import { sendAccessRequestEmail } from '../services/access-request-email';

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
}

/**
 * Verify Firebase ID token from Authorization header.
 * Upserts user record on first login.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    log.auth.warn({ url: req.url }, 'Missing or invalid authorization header');
    return res.status(401).json({ error: { message: 'Missing or invalid authorization header' } });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    const { uid, email, name } = decoded;

    // Upsert user in database
    const existing = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, uid))
      .get();

    if (!existing) {
      const approvalToken = randomBytes(32).toString('hex');
      db.insert(schema.users)
        .values({
          id: uid,
          email: email || '',
          displayName: name || null,
          approved: false,
          approvalToken,
        })
        .run();
      log.auth.info({ userId: uid, email }, 'New user registered');
      sendAccessRequestEmail({
        userEmail: email || '',
        displayName: name || null,
        approvalToken,
      }).catch((err) => log.auth.error({ err, userId: uid }, 'Access request email failed'));
    } else {
      db.update(schema.users)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(schema.users.id, uid))
        .run();
    }

    (req as AuthenticatedRequest).userId = uid;
    (req as AuthenticatedRequest).userEmail = email || '';

    next();
  } catch (error) {
    log.auth.error({ err: error, url: req.url }, 'Token verification failed');
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}
