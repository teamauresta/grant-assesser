import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeVariant = 'outline' | 'subtle';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant };

const VARIANTS: Record<BadgeVariant, string> = {
  outline: 'border-border-strong text-muted-fg',
  subtle: 'border-border-strong bg-neutral-bg text-fg',
};

/**
 * A small neutral tag (program type, level, sector). Not for status: use StatusPill. A pill with a
 * 1px --border-strong outline (Billabong design doc section 4); icons inside are 16px.
 */
export function Badge({ variant = 'outline', className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
}
