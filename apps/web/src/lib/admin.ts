/**
 * Check if the current user's email is in the list of allowed admin emails.
 * @param userEmail The email address of the current user
 * @returns true if the user is an admin, false otherwise
 */
export function isAdmin(userEmail: string | null | undefined): boolean {
  if (!userEmail) {
    return false;
  }

  const allowedEmails = import.meta.env.VITE_ADMIN_ALLOWED_EMAILS;

  if (!allowedEmails) {
    return false;
  }

  // Strip surrounding quotes that some hosting platforms add
  const raw = allowedEmails.replace(/^["']|["']$/g, '');

  const adminEmails = raw
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(userEmail.toLowerCase());
}
