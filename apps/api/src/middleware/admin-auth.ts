import { Request, Response, NextFunction } from 'express';
import { firebaseAuth } from '../config/firebase';
import { log } from '../lib/logger';

export interface AdminRequest extends Request {
  adminUserId: string;
  adminEmail: string;
}

/**
 * Get list of allowed admin email addresses from environment variable.
 * Returns null if not configured (blocks all access).
 */
function getAllowedEmails(): string[] | null {
  let raw = process.env.ADMIN_ALLOWED_EMAILS;
  if (!raw) return null;
  
  // Strip surrounding quotes that some hosting platforms add
  raw = raw.replace(/^["']|["']$/g, '');
  
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Admin authentication middleware.
 * Verifies Firebase ID token AND checks if the user's email is in the
 * ADMIN_ALLOWED_EMAILS environment variable.
 */
export async function adminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    log.auth.warn({ url: req.url }, 'Admin access attempt without authorization header');
    res.status(401).json({ error: { message: 'Missing or invalid Authorization header' } });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decoded = await firebaseAuth.verifyIdToken(idToken);

    // Check allowed emails
    const allowedEmails = getAllowedEmails();
    
    if (!allowedEmails || allowedEmails.length === 0) {
      log.auth.warn(
        { url: req.url, email: decoded.email },
        'Admin access blocked: ADMIN_ALLOWED_EMAILS not configured'
      );
      res.status(403).json({ 
        error: { message: 'Admin panel is not configured' } 
      });
      return;
    }

    if (!decoded.email) {
      log.auth.warn(
        { url: req.url, uid: decoded.uid },
        'Admin access blocked: no email in token'
      );
      res.status(403).json({ 
        error: { message: 'Email verification required' } 
      });
      return;
    }

    if (!allowedEmails.includes(decoded.email.toLowerCase())) {
      log.auth.warn(
        { url: req.url, email: decoded.email },
        'Admin access denied: email not in allowed list'
      );
      res.status(403).json({ 
        error: { message: 'You are not authorized to access the admin panel' } 
      });
      return;
    }

    // Attach admin user info to request
    (req as AdminRequest).adminUserId = decoded.uid;
    (req as AdminRequest).adminEmail = decoded.email;

    log.auth.info(
      { adminEmail: decoded.email, url: req.url },
      'Admin access granted'
    );
    
    next();
  } catch (error) {
    log.auth.error({ err: error, url: req.url }, 'Admin token verification failed');
    res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}
