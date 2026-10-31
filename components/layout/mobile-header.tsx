import { cn } from '@/lib/cn';
import { BrandLink } from './brand-link';
import { PersonaChip } from './persona-chip';
import { BAR_BAND, INSET_BAR } from './inset-bar';

/**
 * Sticky header for small screens (below md): the same inset, rounded bar as the desktop one, with
 * the brand home link and the persona chip.
 */
export function MobileHeader({ className }: { className?: string }) {
  return (
    <header className={cn('sticky top-0 h-(--bar-h) pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 print:static', BAR_BAND, className)}>
      <div className={cn('mx-2 flex h-14 items-center justify-between gap-3 px-3', INSET_BAR)}>
        <BrandLink />
        <PersonaChip />
      </div>
    </header>
  );
}
