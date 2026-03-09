import { Resend } from 'resend';
import { log } from '../lib/logger';

function getAdminNotifyEmail(): string | null {
  const direct = process.env.ADMIN_NOTIFY_EMAIL?.trim();
  if (direct) return direct;
  const raw = process.env.ADMIN_ALLOWED_EMAILS;
  if (!raw) return null;
  const first = raw.replace(/^["']|["']$/g, '').split(',')[0]?.trim().toLowerCase();
  return first || null;
}

/**
 * Base URL for the API (used in the approve link in the email).
 * Set API_PUBLIC_URL in production (e.g. https://api.campsight.app).
 */
function getApiPublicUrl(): string {
  const url = process.env.API_PUBLIC_URL?.trim();
  if (url) return url.replace(/\/$/, '');
  return 'http://localhost:3333';
}

/**
 * App URL for links in emails (e.g. "Sign in" after approval).
 */
function getAppUrl(): string {
  const url = process.env.CORS_ORIGIN?.trim();
  if (url) return url.replace(/\/$/, '');
  return 'http://localhost:4200';
}

export interface AccessRequestEmailParams {
  userEmail: string;
  displayName: string | null;
  approvalToken: string;
}

/**
 * Send one email to the admin when a new user requests access.
 * Uses Resend; if RESEND_API_KEY is missing, logs and skips.
 */
export async function sendAccessRequestEmail(
  params: AccessRequestEmailParams
): Promise<void> {
  const { userEmail, displayName, approvalToken } = params;

  const toEmail = getAdminNotifyEmail();
  if (!toEmail) {
    log.notify.warn('ADMIN_NOTIFY_EMAIL and ADMIN_ALLOWED_EMAILS not set, skipping access request email');
    return;
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    log.notify.warn('RESEND_API_KEY not set, skipping access request email');
    return;
  }

  const apiBase = getApiPublicUrl();
  const approveUrl = `${apiBase}/api/access/approve?token=${encodeURIComponent(approvalToken)}`;

  const resend = new Resend(resendKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'CampSight <noreply@campsight.app>';

  const subject = `CampSight — Access request from ${userEmail}`;
  const display = displayName ? `${displayName} (${userEmail})` : userEmail;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #1a5632; font-size: 24px;">Access request</h1>
          <p style="font-size: 16px; color: #333;">
            <strong>${display}</strong> has requested access to CampSight.
          </p>
          <p style="font-size: 16px; color: #333;">
            <a href="${approveUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Approve access
            </a>
          </p>
          <p style="font-size: 14px; color: #64748b;">
            If the button doesn't work, copy this link: ${approveUrl}
          </p>
        </div>
      `,
    });
    log.notify.info({ userEmail, toEmail }, 'Access request email sent');
  } catch (error) {
    log.notify.error({ err: error, userEmail }, 'Failed to send access request email');
  }
}

/**
 * Send an email to the user who requested access, after an admin has approved them.
 * Uses Resend; if RESEND_API_KEY is missing, logs and skips.
 */
export async function sendAccessApprovedEmail(params: {
  userEmail: string;
  displayName: string | null;
}): Promise<void> {
  const { userEmail, displayName } = params;

  if (!userEmail?.trim()) {
    log.notify.warn('Cannot send access-approved email: no user email');
    return;
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    log.notify.warn('RESEND_API_KEY not set, skipping access approved email');
    return;
  }

  const appUrl = getAppUrl();
  const resend = new Resend(resendKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'CampSight <noreply@campsight.app>';
  const greeting = displayName ? `Hi ${displayName}` : 'Hi';

  try {
    await resend.emails.send({
      from: fromEmail,
      to: userEmail.trim(),
      subject: 'CampSight — Your access has been approved',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1 style="color: #1a5632; font-size: 24px;">Access approved</h1>
          <p style="font-size: 16px; color: #333;">
            ${greeting},
          </p>
          <p style="font-size: 16px; color: #333;">
            Your request to access CampSight has been approved. You can now sign in and use the app.
          </p>
          <p style="font-size: 16px; color: #333;">
            <a href="${appUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Sign in to CampSight
            </a>
          </p>
          <p style="font-size: 14px; color: #64748b;">
            If the button doesn't work, copy this link: ${appUrl}
          </p>
        </div>
      `,
    });
    log.notify.info({ userEmail }, 'Access approved email sent to user');
  } catch (error) {
    log.notify.error({ err: error, userEmail }, 'Failed to send access approved email');
  }
}
