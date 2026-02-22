/**
 * Check if the current user's email is in the list of allowed admin emails.
 * @param userEmail The email address of the current user
 * @returns true if the user is an admin, false otherwise
 */
export function isAdmin(userEmail: string | null | undefined): boolean {
  if (!userEmail) {
    console.log('[Admin Check] No user email provided');
    return false;
  }

  const allowedEmails = import.meta.env.VITE_ADMIN_ALLOWED_EMAILS;
  console.log('[Admin Check] VITE_ADMIN_ALLOWED_EMAILS:', allowedEmails);
  console.log('[Admin Check] User email:', userEmail);
  
  if (!allowedEmails) {
    console.log('[Admin Check] No admin emails configured');
    return false;
  }

  // Strip surrounding quotes that some hosting platforms add
  const raw = allowedEmails.replace(/^["']|["']$/g, '');
  
  const adminEmails = raw
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);

  console.log('[Admin Check] Parsed admin emails:', adminEmails);
  
  const result = adminEmails.includes(userEmail.toLowerCase());
  console.log('[Admin Check] Is admin?', result);
  
  return result;
}
