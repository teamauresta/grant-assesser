'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import { NAV_ITEMS, isActivePath } from './nav-items';
import { BAR_BAND, INSET_BAR } from './inset-bar';

/** Mobile navigation (below md): an inset, rounded bar fixed to the bottom, clear of the home indicator. */
export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className={cn('fixed inset-x-0 bottom-0', BAR_BAND, className)}>
      <ul className={cn('mx-2 mb-[max(0.5rem,env(safe-area-inset-bottom))] grid grid-cols-4', INSET_BAR)}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-xs transition-colors duration-150',
                  active ? 'font-semibold text-accent' : 'text-muted-fg hover:text-fg',
                  focusRing,
                  'focus-visible:-outline-offset-2',
                )}
              >
                <Icon aria-hidden="true" size={20} strokeWidth={1.5} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
