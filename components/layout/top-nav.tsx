'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import { NAV_ITEMS, isActivePath } from './nav-items';
import { BrandLink } from './brand-link';
import { PersonaChip } from './persona-chip';

/** Desktop navigation (md and up). */
export function TopNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <header className={cn('border-b border-border bg-bg', className)}>
      <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-6 px-4">
        <BrandLink />
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
        <PersonaChip />
      </div>
    </header>
  );
}
