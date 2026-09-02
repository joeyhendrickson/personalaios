export const ADMIN_NAV_EMAILS = new Set(['josephgregoryhendrickson@gmail.com'])

export function isKnownAdminEmail(email?: string | null) {
  return !!email && ADMIN_NAV_EMAILS.has(email.trim().toLowerCase())
}
