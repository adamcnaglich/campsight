import { Resend } from 'resend';
import { format, parseISO } from 'date-fns';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { log } from '../lib/logger';

const DETAIL_PAGE = 'https://www.recreation.gov/camping/campsites';

interface SiteAvailability {
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
 * Pluggable notification service.
 * Currently implements email via Resend. Designed to add push later.
 */
export async function sendAvailabilityNotification(
  payload: NotificationPayload
): Promise<void> {
  const { userId, watchId, campgroundName, sites } = payload;

  const user = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();

  if (!user) {
    log.notify.error({ userId }, 'User not found for notification');
    return;
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    log.notify.warn('RESEND_API_KEY not set, skipping email');
    return;
  }

  const resend = new Resend(resendKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'CampSight <noreply@campsight.app>';

  const siteCount = sites.length;
  const subject = siteCount === 1
    ? `CampSight — ${sites[0].campsiteName} is now available!`
    : `CampSight — ${siteCount} sites at ${campgroundName} are now available!`;

  const introText = siteCount === 1
    ? `Great news! <strong>${sites[0].campsiteName}</strong> at <strong>${campgroundName}</strong> has new availability!`
    : `Great news! <strong>${siteCount} sites</strong> at <strong>${campgroundName}</strong> have new availability!`;

  const siteSections = sites.map(buildSiteHtml).join('');

  try {
    await resend.emails.send({
      from: fromEmail,
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
      { userId, watchId, email: user.email, siteCount },
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
  } catch (error) {
    log.notify.error({ err: error, userId, watchId }, 'Failed to send notification email');
  }
}

/**
 * Send a test notification email to the given address (e.g. admin testing).
 * Does not write to notifications_log.
 */
export async function sendTestNotificationEmail(to: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    log.notify.warn('RESEND_API_KEY not set, cannot send test email');
    throw new Error('RESEND_API_KEY is not configured');
  }

  const resend = new Resend(resendKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'CampSight <noreply@campsight.app>';

  await resend.emails.send({
    from: fromEmail,
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
