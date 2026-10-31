'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { buttonClasses } from '@/components/ui/button';
import { focusRing } from '@/components/ui/focus-ring';
import { NAV_ITEMS, isActivePath } from './nav-items';
import { BrandLink } from './brand-link';
import { PersonaChip } from './persona-chip';
import { BAR_BAND, INSET_BAR } from './inset-bar';

/**
 * Desktop navigation (md and up): an inset, rounded bar that sticks to the top, below the notch's
 * safe area. Logo and nav links on the left; the persona chip and "Start assessment" on the right.
 * The call to action is hidden on /assess/ (the wizard and its results), where it would lead nowhere.
 */
export function TopNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const onAssess = isActivePath(pathname, '/assess/');
  return (
    <header className={cn('sticky top-0 h-(--bar-h) pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 print:static', BAR_BAND, className)}>
      <div className={cn('mx-2 flex h-14 items-center gap-4 px-3 lg:gap-6', INSET_BAR)}>
        <BrandLink className="shrink-0" />
        <nav aria-label="Primary" className="min-w-0 flex-1">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm transition-colors duration-150',
                      // The state indicator: a 3px underline inside the bar, resting on its bottom edge.
                      "after:absolute after:inset-x-3 after:-bottom-[5px] after:h-[3px] after:rounded-full after:content-['']",
                      active ? 'font-semibold text-fg after:bg-accent' : 'text-muted-fg hover:bg-bg hover:text-fg',
                      focusRing,
                    )}
                  >
                    <Icon aria-hidden="true" size={16} strokeWidth={1.5} className="hidden lg:block" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <PersonaChip />
          {!onAssess && (
            <Link href="/assess/" className={buttonClasses({ variant: 'primary', size: 'sm' })}>
              Start assessment
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
