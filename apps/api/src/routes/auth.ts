import { Router, Request, Response } from 'express';
import { log } from '../lib/logger';
import {
  AuthenticatedRequest,
  clearSessionCookie,
  getClientIp,
  getSessionToken,
  requireAuth,
  setSessionCookie,
} from '../middleware/auth';
import {
  acceptInvite,
  clearLoginFailures,
  createSession,
  deleteSession,
  deleteUserSessions,
  DUMMY_HASH,
  findInvite,
  findUserByEmail,
  InviteError,
  loginLockRemaining,
  normalizeEmail,
  recordLoginFailure,
  setPassword,
  toPublicUser,
  validatePassword,
  verifyPassword,
} from '../services/auth';

const router = Router();

/**
 * POST /api/auth/login — email + password, sets the session cookie
 */
router.post('/login', async (req: Request, res: Response) => {
  const email = normalizeEmail(String(req.body?.email ?? ''));
  const password = String(req.body?.password ?? '');
  const ip = getClientIp(req);
  const keys = [`ip:${ip}`, `email:${email}`];

  const wait = loginLockRemaining(keys);
  if (wait > 0) {
    return res.status(429).json({
      error: {
        message: `Too many attempts. Try again in ${Math.ceil(wait / 60000)} minutes.`,
        code: 'LOCKED',
      },
    });
  }

  try {
    const user = email ? findUserByEmail(email) : undefined;
    // Always run the hash, so an unknown email takes as long as a wrong password.
    const matches = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !user.passwordHash || !matches) {
      recordLoginFailure(keys);
      log.auth.warn({ email, ip }, 'Failed sign-in');
      return res.status(401).json({
        error: { message: 'Incorrect email or password', code: 'BAD_CREDENTIALS' },
      });
    }

    clearLoginFailures(keys);
    setSessionCookie(req, res, createSession(user.id));
    log.auth.info({ userId: user.id, email: user.email, ip }, 'Signed in');
    res.json({ data: toPublicUser(user) });
  } catch (error) {
    log.auth.error({ err: error, email }, 'Sign-in failed');
    res.status(500).json({ error: { message: 'Sign-in failed' } });
  }
});

/**
 * POST /api/auth/logout — drop this session
 */
router.post('/logout', (req: Request, res: Response) => {
  const token = getSessionToken(req);
  if (token) deleteSession(token);
  clearSessionCookie(req, res);
  res.json({ data: { success: true } });
});

/**
 * GET /api/auth/invite/:token — who an invite link is for
 */
router.get('/invite/:token', (req: Request, res: Response) => {
  const invite = findInvite(req.params.token);
  if (!invite) {
    return res.status(404).json({
      error: { message: 'This invite link is invalid or has expired' },
    });
  }
  res.json({ data: { email: invite.email, expiresAt: invite.expiresAt } });
});

/**
 * POST /api/auth/invite/:token — create the account and sign in
 */
router.post('/invite/:token', async (req: Request, res: Response) => {
  const password = req.body?.password;
  const rawName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';
  const displayName = rawName ? rawName.slice(0, 80) : null;

  const problem = validatePassword(password);
  if (problem) {
    return res.status(400).json({ error: { message: problem } });
  }

  try {
    const user = await acceptInvite(req.params.token, displayName, password);
    setSessionCookie(req, res, createSession(user.id));
    res.status(201).json({ data: toPublicUser(user) });
  } catch (error) {
    if (error instanceof InviteError) {
      return res.status(400).json({ error: { message: error.message } });
    }
    log.auth.error({ err: error }, 'Failed to accept invite');
    res.status(500).json({ error: { message: 'Could not create the account' } });
  }
});

/**
 * POST /api/auth/password — change your own password
 */
router.post('/password', requireAuth, async (req: Request, res: Response) => {
  const { authUser, sessionToken } = req as AuthenticatedRequest;
  const current = String(req.body?.currentPassword ?? '');
  const next = req.body?.newPassword;

  try {
    if (!authUser.passwordHash || !(await verifyPassword(current, authUser.passwordHash))) {
      return res.status(400).json({
        error: { message: 'Current password is incorrect' },
      });
    }

    const problem = validatePassword(next);
    if (problem) {
      return res.status(400).json({ error: { message: problem } });
    }

    await setPassword(authUser.id, next);
    // Other devices are signed out; this one stays in.
    deleteUserSessions(authUser.id, sessionToken);
    log.auth.info({ userId: authUser.id }, 'Password changed');
    res.json({ data: { success: true } });
  } catch (error) {
    log.auth.error({ err: error, userId: authUser.id }, 'Failed to change password');
    res.status(500).json({ error: { message: 'Could not change the password' } });
  }
});

export default router;
