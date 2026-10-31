import type { IconName } from '@/lib/art';

/** A primary nav item; its icon is one of the owner's sage icons (SageIcon). */
export type NavItem = { href: string; label: string; icon: IconName };

// Hrefs carry the trailing slash the static export uses, so they match usePathname() directly.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/programs/', label: 'Programs', icon: 'grid' },
  { href: '/assess/', label: 'Assess', icon: 'checklist' },
  { href: '/plan/', label: 'My Plan', icon: 'plan-board' },
  { href: '/report/', label: 'Report', icon: 'report' },
];

/** True when `pathname` is `href` or a page beneath it (e.g. /programs/rdti/ is under Programs). */
export function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return path === href || path.startsWith(href);
}
