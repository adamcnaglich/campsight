import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  scryptSync,
  timingSafeEqual,
} from 'crypto';
import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm';
import { db, schema } from '../db';
import { log } from '../lib/logger';

export type UserRow = typeof schema.users.$inferSelect;

export interface PublicUser {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
}

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isAdmin: Boolean(user.isAdmin),
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

// ─── Passwords ─────────────────────────────────────────────────────────────────

// scrypt cost parameters, stored with every hash so they can be raised later
// without invalidating existing passwords.
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`;
  }
  return null;
}

function encodeHash(salt: Buffer, key: Buffer): string {
  return [
    'scrypt',
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

function decodeHash(stored: string) {
  const [scheme, n, r, p, salt, key] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !key) return null;
  return {
    params: { N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem },
    salt: Buffer.from(salt, 'base64'),
    key: Buffer.from(key, 'base64'),
  };
}

export function hashPasswordSync(password: string): string {
  const salt = randomBytes(16);
  return encodeHash(salt, scryptSync(password, salt, KEY_LENGTH, SCRYPT));
}

export function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SCRYPT, (err, key) =>
      err ? reject(err) : resolve(encodeHash(salt, key)),
    );
  });
}

export function verifyPasswordSync(password: string, stored: string): boolean {
  const parsed = decodeHash(stored);
  if (!parsed) return false;
  const key = scryptSync(password, parsed.salt, parsed.key.length, parsed.params);
  return timingSafeEqual(key, parsed.key);
}

export function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = decodeHash(stored);
  if (!parsed) return Promise.resolve(false);
  return new Promise((resolve, reject) => {
    scrypt(password, parsed.salt, parsed.key.length, parsed.params, (err, key) =>
      err ? reject(err) : resolve(timingSafeEqual(key, parsed.key)),
    );
  });
}

// Compared against when the email is unknown, so a miss costs the same time
// as a wrong password and does not reveal which emails have accounts.
export const DUMMY_HASH = hashPasswordSync(randomBytes(24).toString('hex'));

// ─── Users ─────────────────────────────────────────────────────────────────────

export function findUserByEmail(email: string): UserRow | undefined {
  return db
    .select()
    .from(schema.users)
    .where(sql`${schema.users.email} = ${normalizeEmail(email)} COLLATE NOCASE`)
    .get();
}

export function findUserById(id: string): UserRow | undefined {
  return db.select().from(schema.users).where(eq(schema.users.id, id)).get();
}

export async function setPassword(userId: string, password: string) {
  const passwordHash = await hashPassword(password);
  db.update(schema.users)
    .set({ passwordHash, updatedAt: new Date().toISOString() })
    .where(eq(schema.users.id, userId))
    .run();
}

// ─── Sessions ──────────────────────────────────────────────────────────────────

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

// Only a hash of each token is stored, so a copy of the database cannot be
// replayed as a login.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString('base64url');
  db.insert(schema.sessions)
    .values({
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    })
    .run();
  return token;
}

export function getSessionUser(token: string): UserRow | null {
  const tokenHash = hashToken(token);
  const session = db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.tokenHash, tokenHash))
    .get();
  if (!session) return null;

  if (session.expiresAt <= new Date().toISOString()) {
    db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, tokenHash)).run();
    return null;
  }

  return findUserById(session.userId) ?? null;
}

export function deleteSession(token: string) {
  db.delete(schema.sessions)
    .where(eq(schema.sessions.tokenHash, hashToken(token)))
    .run();
}

/** Sign a user out everywhere, optionally keeping the session they are using. */
export function deleteUserSessions(userId: string, exceptToken?: string) {
  const keep = exceptToken ? hashToken(exceptToken) : null;
  const rows = db
    .select({ tokenHash: schema.sessions.tokenHash })
    .from(schema.sessions)
    .where(eq(schema.sessions.userId, userId))
    .all();
  for (const row of rows) {
    if (row.tokenHash === keep) continue;
    db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, row.tokenHash)).run();
  }
}

export function pruneExpiredSessions() {
  const now = new Date().toISOString();
  db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, now)).run();
  db.delete(schema.invites).where(lt(schema.invites.expiresAt, now)).run();
}

// ─── Invites ───────────────────────────────────────────────────────────────────

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createInvite(email: string, invitedBy: string) {
  const normalized = normalizeEmail(email);
  // One live invite per address: a new one replaces any earlier unused link.
  db.delete(schema.invites)
    .where(and(eq(schema.invites.email, normalized), isNull(schema.invites.usedAt)))
    .run();

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  db.insert(schema.invites)
    .values({ tokenHash: hashToken(token), email: normalized, invitedBy, expiresAt })
    .run();
  return { token, email: normalized, expiresAt };
}

export function findInvite(token: string) {
  return (
    db
      .select()
      .from(schema.invites)
      .where(
        and(
          eq(schema.invites.tokenHash, hashToken(token)),
          isNull(schema.invites.usedAt),
          gt(schema.invites.expiresAt, new Date().toISOString()),
        ),
      )
      .get() ?? null
  );
}

export function listPendingInvites() {
  return db
    .select({
      id: schema.invites.tokenHash,
      email: schema.invites.email,
      createdAt: schema.invites.createdAt,
      expiresAt: schema.invites.expiresAt,
    })
    .from(schema.invites)
    .where(
      and(
        isNull(schema.invites.usedAt),
        gt(schema.invites.expiresAt, new Date().toISOString()),
      ),
    )
    .all();
}

export function revokeInvite(id: string) {
  return db.delete(schema.invites).where(eq(schema.invites.tokenHash, id)).run();
}

export class InviteError extends Error {}

export async function acceptInvite(
  token: string,
  displayName: string | null,
  password: string,
): Promise<UserRow> {
  const invite = findInvite(token);
  if (!invite) throw new InviteError('This invite link is invalid or has expired');
  if (findUserByEmail(invite.email)) {
    throw new InviteError('An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const id = randomUUID();
  const now = new Date().toISOString();

  db.transaction((tx) => {
    tx.insert(schema.users)
      .values({ id, email: invite.email, displayName, passwordHash, isAdmin: false })
      .run();
    tx.update(schema.invites)
      .set({ usedAt: now })
      .where(eq(schema.invites.tokenHash, invite.tokenHash))
      .run();
  });

  log.auth.info({ userId: id, email: invite.email }, 'Invite accepted, account created');
  const user = findUserById(id);
  if (!user) throw new Error('Account creation failed');
  return user;
}

// ─── Admin bootstrap ───────────────────────────────────────────────────────────

/**
 * Make sure there is an admin account, from ADMIN_EMAIL and ADMIN_PASSWORD.
 *
 * - An existing single-user install has one row with id `local`; it becomes
 *   the admin and keeps its watches.
 * - ADMIN_PASSWORD, when set, is the admin's password: it is applied on every
 *   boot, which doubles as the recovery path. Unset, the stored one stays.
 * - NOTIFY_EMAIL is accepted as a fallback for ADMIN_EMAIL so installs from
 *   before accounts keep working.
 */
export function ensureAdminUser() {
  const email = normalizeEmail(
    process.env.ADMIN_EMAIL || process.env.NOTIFY_EMAIL || '',
  );
  const password = process.env.ADMIN_PASSWORD || '';

  let admin =
    db.select().from(schema.users).where(eq(schema.users.isAdmin, true)).get() ??
    findUserById('local') ??
    (email ? findUserByEmail(email) : undefined);

  if (!admin) {
    if (!email) {
      log.auth.error('ADMIN_EMAIL is not set and no admin exists; nobody can sign in');
      return;
    }
    const id = randomUUID();
    db.insert(schema.users).values({ id, email, displayName: null, isAdmin: true }).run();
    admin = findUserById(id);
    log.auth.info({ email }, 'Created admin account');
  }
  if (!admin) return;

  const updates: Partial<UserRow> = {};
  if (!admin.isAdmin) updates.isAdmin = true;
  if (email && normalizeEmail(admin.email) !== email) {
    const clash = findUserByEmail(email);
    if (clash && clash.id !== admin.id) {
      log.auth.warn({ email }, 'ADMIN_EMAIL belongs to another account; admin email left unchanged');
    } else {
      updates.email = email;
    }
  }

  if (password) {
    const problem = validatePassword(password);
    if (problem) {
      log.auth.error(`ADMIN_PASSWORD rejected: ${problem}`);
    } else if (!admin.passwordHash || !verifyPasswordSync(password, admin.passwordHash)) {
      updates.passwordHash = hashPasswordSync(password);
      // The password changed, so sign the admin out everywhere.
      db.delete(schema.sessions).where(eq(schema.sessions.userId, admin.id)).run();
      log.auth.info({ email: updates.email ?? admin.email }, 'Admin password set from ADMIN_PASSWORD');
    }
  }

  if (Object.keys(updates).length > 0) {
    db.update(schema.users)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(schema.users.id, admin.id))
      .run();
  }

  const current = findUserById(admin.id);
  if (!current?.passwordHash) {
    log.auth.error('The admin account has no password; set ADMIN_PASSWORD so someone can sign in');
  }
  if (!current?.email) {
    log.auth.warn('The admin account has no email; set ADMIN_EMAIL');
  }
}

// ─── Login throttling ──────────────────────────────────────────────────────────

const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

interface Attempts {
  failures: number;
  windowStart: number;
  lockedUntil: number;
}

// In memory is enough: a restart clearing it only helps an attacker by one
// window, and there is a single process.
const attempts = new Map<string, Attempts>();

/** Milliseconds until any of these keys may try again; 0 when not locked. */
export function loginLockRemaining(keys: string[]): number {
  const now = Date.now();
  return Math.max(0, ...keys.map((key) => (attempts.get(key)?.lockedUntil ?? 0) - now));
}

export function recordLoginFailure(keys: string[]) {
  const now = Date.now();
  for (const key of keys) {
    const entry = attempts.get(key);
    if (!entry || now - entry.windowStart > WINDOW_MS) {
      attempts.set(key, { failures: 1, windowStart: now, lockedUntil: 0 });
      continue;
    }
    entry.failures += 1;
    if (entry.failures >= MAX_FAILURES) entry.lockedUntil = now + LOCK_MS;
  }

  // Keep the map from growing without bound under a guessing attack.
  if (attempts.size > 5000) {
    for (const [key, entry] of attempts) {
      if (now - entry.windowStart > WINDOW_MS && entry.lockedUntil < now) attempts.delete(key);
    }
  }
}

export function clearLoginFailures(keys: string[]) {
  for (const key of keys) attempts.delete(key);
}
