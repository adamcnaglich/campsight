import { Resend } from 'resend';
import { format, parseISO } from 'date-fns';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { log } from '../lib/logger';

const DETAIL_PAGE = 'https://www.recreation.gov/camping/campsites';

interface NotificationPayload {
  userId: string;
  watchId: number;
  campsiteId: string;
  campsiteName: string;
  campgroundName: string;
  newlyAvailableDates: string[];
}

/**
 * Pluggable notification service.
 * Currently implements email via Resend. Designed to add push later.
 */
export async function sendAvailabilityNotification(
  payload: NotificationPayload
): Promise<void> {
  const { userId, watchId, campsiteId, campsiteName, campgroundName, newlyAvailableDates } =
    payload;

  // Look up user email
  const user = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();

  if (!user) {
    log.notify.error({ userId }, 'User not found for notification');
    return;
  }

  const formattedDates = newlyAvailableDates
    .map((d) => {
      try {
        return format(parseISO(d), 'MMM do, yyyy');
      } catch {
        return d;
      }
    })
    .join(', ');

  const siteUrl = `${DETAIL_PAGE}/${campsiteId}`;

  // Send email via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    log.notify.warn('RESEND_API_KEY not set, skipping email');
    return;
  }

  const resend = new Resend(resendKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'CampSight <noreply@campsight.app>';

  try {
    await resend.emails.send({
      from: fromEmail,
      to: user.email,
      subject: `CampSight — ${campsiteName} is now available!`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #1a5632; font-size: 24px;">🏕️ Availability Alert</h1>
          <p style="font-size: 16px; color: #333;">
            Great news! <strong>${campsiteName}</strong> at <strong>${campgroundName}</strong>
            has new availability!
          </p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px; color: #166534;">
              <strong>Available dates:</strong> ${formattedDates}
            </p>
          </div>
          <a href="${siteUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 8px;">
            Reserve on Recreation.gov →
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 24px;">
            You're receiving this because you set up a watch on CampSight.
          </p>
        </div>
      `,
    });

    log.notify.info(
      { userId, watchId, email: user.email, dates: newlyAvailableDates },
      'Availability notification email sent',
    );

    // Log the notification
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
