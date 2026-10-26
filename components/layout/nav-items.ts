import { ClipboardCheck, FileText, LayoutGrid, SquareKanban, type LucideIcon } from 'lucide-react';

export type NavItem = { href: string; label: string; icon: LucideIcon };

// Hrefs carry the trailing slash the static export uses, so they match usePathname() directly.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/programs/', label: 'Programs', icon: LayoutGrid },
  { href: '/assess/', label: 'Assess', icon: ClipboardCheck },
  { href: '/plan/', label: 'My Plan', icon: SquareKanban },
  { href: '/report/', label: 'Report', icon: FileText },
];

/** True when `pathname` is `href` or a page beneath it (e.g. /programs/rdti/ is under Programs). */
export function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return path === href || path.startsWith(href);
}
