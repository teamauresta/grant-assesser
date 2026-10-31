'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import { SageIcon } from '@/components/ui/sage-icon';
import { NAV_ITEMS, isActivePath } from './nav-items';
import { BAR_BAND, INSET_BAR } from './inset-bar';

/**
 * Mobile navigation (below md): an inset, rounded bar fixed to the bottom. Its band is --bottom-bar-h
 * tall, so the gap under the bar is max(8px, the home indicator).
 */
export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className={cn('fixed inset-x-0 bottom-0 h-(--bottom-bar-h) print:hidden', BAR_BAND, className)}>
      <ul className={cn('mx-2 grid grid-cols-4', INSET_BAR)}>
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-xs transition-colors duration-150',
                  // The state indicator, as the top bar's: a 3px underline at the item's foot, a
                  // pseudo-element, so the bar keeps its height (the sage icon takes no accent).
                  "after:absolute after:inset-x-5 after:bottom-1 after:h-[3px] after:rounded-full after:content-['']",
                  active ? 'font-semibold text-accent after:bg-accent forced-colors:after:bg-[CanvasText]' : 'text-muted-fg hover:text-fg',
                  focusRing,
                  'focus-visible:-outline-offset-2',
                )}
              >
                <SageIcon name={icon} size={24} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
