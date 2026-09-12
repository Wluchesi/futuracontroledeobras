export const SUPER_ADMIN_EMAILS = [
  'wluchesi@gmail.com',
  'cinzialuchesi@gmail.com',
];

export function checkIsSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}
