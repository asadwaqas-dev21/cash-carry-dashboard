// Matches the public.user_role enum in the database.
export type Role = 'owner' | 'sales_person';

export const ROLES: Role[] = ['owner', 'sales_person'];

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  sales_person: 'Sales person',
};

const EVERYONE: Role[] = ['owner', 'sales_person'];
const OWNER_ONLY: Role[] = ['owner'];

/**
 * Which roles may open each dashboard section; the longest matching prefix
 * wins and unlisted paths are owner-only. Used by the sidebar and enforced on
 * every page. The database RLS policies are the final gate on the data itself.
 */
export const PAGE_ACCESS: Record<string, Role[]> = {
  '/': EVERYONE,
  '/orders': EVERYONE,
  '/pos': EVERYONE,
  '/deliveries': EVERYONE,
  '/products': EVERYONE,
  '/products/new': OWNER_ONLY,
  '/products/edit': OWNER_ONLY,
  '/inventory': EVERYONE,
  '/categories': EVERYONE,
  '/customers': EVERYONE,
  '/riders': OWNER_ONLY,
  '/staff': OWNER_ONLY,
  '/team': OWNER_ONLY,
  '/payments': OWNER_ONLY,
  '/cash': OWNER_ONLY,
  '/analytics': OWNER_ONLY,
  // Everyone manages their own profile; store sections inside are owner-only.
  '/settings': EVERYONE,
};

export function canAccess(role: Role, path: string): boolean {
  const match = Object.keys(PAGE_ACCESS)
    .filter((prefix) => (prefix === '/' ? path === '/' : path === prefix || path.startsWith(`${prefix}/`)))
    .sort((a, b) => b.length - a.length)[0];
  return (match ? PAGE_ACCESS[match] : OWNER_ONLY).includes(role);
}
