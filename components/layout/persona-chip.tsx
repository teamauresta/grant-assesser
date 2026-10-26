'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import { isActivePath } from './nav-items';

/** Links to settings and names the current persona. Task 13 replaces the placeholder with the store's persona. */
export function PersonaChip({ className }: { className?: string }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, '/settings/');
  return (
    <Link
      href="/settings/"
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors duration-150',
        active ? 'border-accent font-semibold text-fg' : 'border-border text-muted-fg hover:border-border-strong hover:text-fg',
        focusRing,
        className,
      )}
    >
      <UserRound aria-hidden="true" size={16} strokeWidth={1.5} />
      Choose persona
    </Link>
  );
}
