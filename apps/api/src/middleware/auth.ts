import { Request, Response, NextFunction } from 'express';
import {
  getSessionUser,
  SESSION_MAX_AGE_SECONDS,
  type UserRow,
} from '../services/auth';

export const SESSION_COOKIE = 'campsight_session';

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
  isAdmin: boolean;
  authUser: UserRow;
  sessionToken: string;
}

/**
 * The real client address. Behind the Cloudflare tunnel every request arrives
 * from the connector, so prefer the header Cloudflare sets.
 */
export function getClientIp(req: Request): string {
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf) return cf.trim();

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return first.trim();
  }
  return req.socket.remoteAddress ?? '';
}

/** True when the browser reached us over HTTPS, directly or via the tunnel. */
export function isHttps(req: Request): boolean {
  const proto = req.headers['x-forwarded-proto'];
  const first = Array.isArray(proto) ? proto[0] : proto?.split(',')[0];
  return first?.trim() === 'https' || req.secure;
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        // Malformed percent-encoding: treat as no cookie rather than erroring.
        return null;
      }
    }
  }
  return null;
}

function cookieAttributes(req: Request): string {
  // Secure only over HTTPS, so signing in on the LAN over plain http still works.
  return `Path=/; HttpOnly; SameSite=Lax${isHttps(req) ? '; Secure' : ''}`;
}

export function setSessionCookie(req: Request, res: Response, token: string) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${SESSION_MAX_AGE_SECONDS}; ${cookieAttributes(req)}`,
  );
}

export function clearSessionCookie(req: Request, res: Response) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; ${cookieAttributes(req)}`);
}

export function getSessionToken(req: Request): string | null {
  return readCookie(req, SESSION_COOKIE);
}

/** Attach the signed-in user, if any. Never rejects; see requireAuth. */
export function sessionMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = getSessionToken(req);
  if (token) {
    const user = getSessionUser(token);
    if (user) {
      const authed = req as AuthenticatedRequest;
      authed.userId = user.id;
      authed.userEmail = user.email;
      authed.isAdmin = Boolean(user.isAdmin);
      authed.authUser = user;
      authed.sessionToken = token;
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as AuthenticatedRequest).userId) {
    return res.status(401).json({
      error: { message: 'Not signed in', code: 'UNAUTHENTICATED' },
    });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!(req as AuthenticatedRequest).isAdmin) {
    return res.status(403).json({
      error: { message: 'Admins only', code: 'FORBIDDEN' },
    });
  }
  next();
}
