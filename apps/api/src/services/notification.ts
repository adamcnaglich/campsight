import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { format, parseISO } from 'date-fns';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { log } from '../lib/logger';

const DETAIL_PAGE = 'https://www.recreation.gov/camping/campsites';

// ─── SMTP ──────────────────────────────────────────────────────────────────────

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

/**
 * Read SMTP settings from the environment. Returns null when SMTP_HOST is
 * unset, which the callers treat as "email is off".
 *
 *   SMTP_HOST    e.g. smtp.mail.me.com
 *   SMTP_PORT    default 587 (STARTTLS); 465 switches to implicit TLS
 *   SMTP_SECURE  "true" / "false" to override the port-based TLS choice
 *   SMTP_USER    login, also the default sender address
 *   SMTP_PASS    password or app-specific password
 *   SMTP_FROM    sender, default "CampSight <SMTP_USER>"
 */
export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT) || 587;
  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure = secureEnv ? secureEnv === 'true' : port === 465;
  const user = process.env.SMTP_USER?.trim() || '';
  const pass = process.env.SMTP_PASS || '';
  const from =
    process.env.SMTP_FROM?.trim() ||
    (user ? `CampSight <${user}>` : `CampSight <campsight@${host}>`);

  return { host, port, secure, user, pass, from };
}

let transporter: Transporter | null = null;
let transporterKey = '';

function getTransporter(cfg: SmtpConfig): Transporter {
  const key = `${cfg.host}:${cfg.port}:${cfg.secure}:${cfg.user}`;
  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
    transporterKey = key;
  }
  return transporter;
}

interface MailMessage {
  to: string;
  subject: string;
  html: string;
}

/** Send one message over SMTP. Throws when SMTP is not configured. */
export async function sendMail(message: MailMessage): Promise<void> {
  const cfg = getSmtpConfig();
  if (!cfg) {
    throw new Error('SMTP_HOST is not configured');
  }
  await getTransporter(cfg).sendMail({ from: cfg.from, ...message });
}

// ─── Messages ──────────────────────────────────────────────────────────────────

interface SiteAvailability {
  watchSiteId: number;
  campsiteId: string;
  campsiteName: string;
  newlyAvailableDates: string[];
}

interface NotificationPayload {
  userId: string;
  watchId: number;
  campgroundName: string;
  sites: SiteAvailability[];
}

function formatDates(dates: string[]): string {
  return dates
    .map((d) => {
      try {
        return format(parseISO(d), 'MMM do, yyyy');
      } catch {
        return d;
      }
    })
    .join(', ');
}

function buildSiteHtml(site: SiteAvailability): string {
  const siteUrl = `${DETAIL_PAGE}/${site.campsiteId}`;
  const formattedDates = formatDates(site.newlyAvailableDates);

  return `
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 12px 0;">
      <p style="margin: 0 0 4px 0; font-size: 15px; color: #166534; font-weight: 600;">
        ${site.campsiteName}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #166534;">
        <strong>Available dates:</strong> ${formattedDates}
      </p>
      <a href="${siteUrl}" style="font-size: 13px; color: #16a34a; text-decoration: underline;">
        View on Recreation.gov
      </a>
    </div>`;
}

/**
 * Pluggable notification service. Currently email over SMTP.
 *
 * Returns whether the notification was delivered. The caller uses this to decide
 * whether to record the dates as notified — a false return leaves them eligible
 * to alert again on the next cycle.
 */
export async function sendAvailabilityNotification(
  payload: NotificationPayload
): Promise<boolean> {
  const { userId, watchId, campgroundName, sites } = payload;

  const user = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();

  if (!user) {
    log.notify.error({ userId }, 'User not found for notification');
    return false;
  }

  if (!user.email) {
    log.notify.warn({ userId, watchId }, 'Account has no email address, skipping email');
    return false;
  }

  if (!getSmtpConfig()) {
    log.notify.warn('SMTP_HOST not set, skipping email');
    return false;
  }

  const siteCount = sites.length;
  const subject = siteCount === 1
    ? `CampSight — ${sites[0].campsiteName} is now available!`
    : `CampSight — ${siteCount} sites at ${campgroundName} are now available!`;

  const introText = siteCount === 1
    ? `Great news! <strong>${sites[0].campsiteName}</strong> at <strong>${campgroundName}</strong> has new availability!`
    : `Great news! <strong>${siteCount} sites</strong> at <strong>${campgroundName}</strong> have new availability!`;

  const siteSections = sites.map(buildSiteHtml).join('');

  try {
    await sendMail({
      to: user.email,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #1a5632; font-size: 24px;">🏕️ Availability Alert</h1>
          <p style="font-size: 16px; color: #333;">
            ${introText}
          </p>
          ${siteSections}
          <p style="font-size: 12px; color: #999; margin-top: 24px;">
            You're receiving this because you set up a watch on CampSight.
          </p>
        </div>
      `,
    });

    log.notify.info(
      {
        userId,
        watchId,
        email: user.email,
        siteCount,
        dates: sites.flatMap((site) => site.newlyAvailableDates),
      },
      'Availability notification email sent',
    );

    db.insert(schema.notificationsLog)
      .values({
        userId,
        watchId,
        channel: 'email',
        payload: JSON.stringify(payload),
      })
      .run();

    return true;
  } catch (error) {
    log.notify.error({ err: error, userId, watchId }, 'Failed to send notification email');
    return false;
  }
}

/**
 * Send a test notification email to the given address (admin panel).
 * Does not write to notifications_log.
 */
export async function sendTestNotificationEmail(to: string): Promise<void> {
  if (!getSmtpConfig()) {
    log.notify.warn('SMTP_HOST not set, cannot send test email');
    throw new Error('SMTP_HOST is not configured');
  }

  await sendMail({
    to,
    subject: 'CampSight — Test notification',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #1a5632; font-size: 24px;">🏕️ Test Notification</h1>
        <p style="font-size: 16px; color: #333;">
          This is a test email from the CampSight admin panel. If you received this,
          notification delivery is working correctly.
        </p>
        <p style="font-size: 12px; color: #999; margin-top: 24px;">
          Sent at ${new Date().toISOString()}
        </p>
      </div>
    `,
  });

  log.notify.info({ to }, 'Test notification email sent');
}
