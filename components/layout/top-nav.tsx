'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import { NAV_ITEMS, isActivePath } from './nav-items';

/** Desktop navigation (md and up). */
export function TopNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const settingsActive = isActivePath(pathname, '/settings/');
  return (
    <header className={cn('border-b border-border bg-bg', className)}>
      <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-6 px-4">
        <Link
          href="/"
          aria-current={pathname === '/' ? 'page' : undefined}
          className={cn('inline-flex min-h-11 items-center rounded-md text-base font-semibold tracking-tight', focusRing)}
        >
          Grant Navigator
        </Link>
        <nav aria-label="Primary" className="flex-1">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm transition-colors duration-150',
                      "after:absolute after:inset-x-3 after:-bottom-[11px] after:h-0.5 after:rounded-full after:content-['']",
                      active ? 'font-semibold text-fg after:bg-accent' : 'text-muted-fg hover:text-fg',
                      focusRing,
                    )}
                  >
                    <Icon aria-hidden="true" size={16} strokeWidth={1.5} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {/* Task 13 replaces the placeholder text with the persona from the workspace store. */}
        <Link
          href="/settings/"
          aria-current={settingsActive ? 'page' : undefined}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors duration-150',
            settingsActive ? 'border-accent font-semibold text-fg' : 'border-border text-muted-fg hover:border-border-strong hover:text-fg',
            focusRing,
          )}
        >
          <UserRound aria-hidden="true" size={16} strokeWidth={1.5} />
          Choose persona
        </Link>
      </div>
    </header>
  );
}
