import { cn } from '@/lib/cn';
import { BrandLink } from './brand-link';
import { PersonaChip } from './persona-chip';

/** Slim sticky header for small screens (below md): brand home link and the persona chip. */
export function MobileHeader({ className }: { className?: string }) {
  return (
    <header className={cn('sticky top-0 z-40 border-b border-border bg-bg', className)}>
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <BrandLink />
        <PersonaChip />
      </div>
    </header>
  );
}
