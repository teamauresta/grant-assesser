import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeVariant = 'outline' | 'subtle';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant };

const VARIANTS: Record<BadgeVariant, string> = {
  outline: 'border-border text-muted-fg',
  subtle: 'border-transparent bg-surface text-fg',
};

/** A small neutral tag (program type, level, sector). Not for status: use StatusPill. */
export function Badge({ variant = 'outline', className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium leading-5',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
}
