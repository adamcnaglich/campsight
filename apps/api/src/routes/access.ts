import express, { Request, Response } from 'express';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { log } from '../lib/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendAccessApprovedEmail } from '../services/access-request-email';

function getAllowedEmails(): string[] | null {
  let raw = process.env.ADMIN_ALLOWED_EMAILS;
  if (!raw) return null;
  raw = raw.replace(/^["']|["']$/g, '');
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * GET /api/access/status — requires auth.
 * Returns { approved: boolean }. Approved = in ADMIN_ALLOWED_EMAILS or user.approved.
 */
export function getAccessStatus(req: Request, res: Response) {
  const { userId, userEmail } = req as AuthenticatedRequest;
  const allowedEmails = getAllowedEmails();
  if (allowedEmails?.includes(userEmail.toLowerCase())) {
    return res.json({ approved: true });
  }
  const user = db
    .select({ approved: schema.users.approved })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();
  const approved = Boolean(user?.approved);
  return res.json({ approved });
}

/**
 * GET /api/access/approve?token=xxx — public, no auth.
 * Finds user by approval_token, sets approved=1, clears token, redirects to app.
 */
export function approveAccess(req: Request, res: Response) {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  if (!token) {
    res.status(400).send(
      '<!DOCTYPE html><html><body><p>Missing token.</p></body></html>'
    );
    return;
  }

  const user = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.approvalToken, token))
    .get();

  if (!user) {
    res.status(404).send(
      '<!DOCTYPE html><html><body><p>Invalid or expired link.</p></body></html>'
    );
    return;
  }

  const appUrl = (process.env.CORS_ORIGIN || 'http://localhost:4200').replace(/\/$/, '');
  const redirectUrl = `${appUrl}/access-approved`;

  if (user.approved) {
    res.redirect(302, redirectUrl);
    return;
  }

  db.update(schema.users)
    .set({ approved: true, approvalToken: null, updatedAt: new Date().toISOString() })
    .where(eq(schema.users.id, user.id))
    .run();

  log.auth.info({ userId: user.id, email: user.email }, 'User access approved via link');

  sendAccessApprovedEmail({
    userEmail: user.email,
    displayName: user.displayName,
  }).catch((err) =>
    log.auth.error({ err, userId: user.id, email: user.email }, 'Access approved email to user failed')
  );

  res.redirect(302, redirectUrl);
}

const router = express.Router();
router.get('/status', getAccessStatus);

export default router;
