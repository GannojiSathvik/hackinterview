/**
 * Server-only admin allowlist for V2.4 question-bank management. This is
 * NOT a full RBAC system — just an email allowlist checked server-side
 * (never in a client component/bundle) against the verified NextAuth
 * session. Used by both the admin page gate and the admin API proxy so
 * "who is an admin" is defined in exactly one place.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}
