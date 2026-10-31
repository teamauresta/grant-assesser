import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { focusRing } from './focus-ring';

export type DisclosureProps = {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

/** Show/hide section built on native <details>, so it works without JavaScript and with find-in-page. */
export function Disclosure({ summary, children, defaultOpen, className }: DisclosureProps) {
  return (
    <details open={defaultOpen} className={cn('group rounded-lg border border-border', className)}>
      <summary
        className={cn(
          'flex min-h-11 list-none items-center justify-between gap-3 rounded-lg px-4 py-2 font-medium',
          '[&::-webkit-details-marker]:hidden',
          focusRing,
        )}
      >
        <span>{summary}</span>
        <ChevronDown
          aria-hidden="true"
          size={16}
          className="shrink-0 text-muted-fg transition-transform duration-150 group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-border px-4 py-3">{children}</div>
    </details>
  );
}
