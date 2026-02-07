import { Request, Response, NextFunction } from 'express';
import { firebaseAuth } from '../config/firebase';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';

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
      db.insert(schema.users)
        .values({
          id: uid,
          email: email || '',
          displayName: name || null,
        })
        .run();
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
    console.error('[AUTH] Token verification failed:', error);
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}
