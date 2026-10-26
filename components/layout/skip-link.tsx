import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';

export function SkipLink({ targetId = 'main' }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]',
        'focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-md focus:border focus:border-border',
        'focus:bg-bg focus:px-4 focus:text-sm focus:font-medium focus:text-fg',
        focusRing,
      )}
    >
      Skip to content
    </a>
  );
}
