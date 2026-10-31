'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import { PERSONAS_INFO } from '@/lib/personas';
import { useWorkspace } from '@/lib/store/use-workspace';
import { isActivePath } from './nav-items';

/**
 * Links to settings and names the stored persona. Shows "Choose persona" on the server and until the
 * workspace has loaded, so the static HTML and first client render match.
 */
export function PersonaChip({ className }: { className?: string }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, '/settings/');
  const persona = useWorkspace((s) => (s.ready ? s.ws.profile.persona : undefined));
  return (
    <Link
      href="/settings/"
      aria-current={active ? 'page' : undefined}
      className={cn(
        // An outline chip on --surface, drawn 36px tall to sit level with the bar's button; ::before
        // stretches the hit area to 44px.
        "relative inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-full border bg-surface px-3.5 text-sm transition-colors duration-150 before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
        active ? 'border-accent font-semibold text-fg' : 'border-border text-muted-fg hover:border-border-strong hover:text-fg',
        focusRing,
        className,
      )}
    >
      <UserRound aria-hidden="true" size={16} strokeWidth={1.5} />
      {persona ? (
        <>
          <span className="sr-only">Persona: </span>
          {PERSONAS_INFO[persona].label}
        </>
      ) : (
        'Choose persona'
      )}
    </Link>
  );
}
