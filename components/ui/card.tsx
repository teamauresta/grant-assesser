import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'article' | 'section' | 'li';
  padding?: 'none' | 'md' | 'lg';
  /** Adds a hover border, shadow and 2px lift for cards that contain a full-card link. */
  interactive?: boolean;
};

const PADDING = { none: '', md: 'p-4', lg: 'p-6' } as const;

export function Card({ as: Tag = 'div', padding = 'md', interactive = false, className, ...rest }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-lg border border-border bg-surface',
        PADDING[padding],
        interactive && 'relative transition-[border-color,translate,box-shadow] duration-150 hover:border-border-strong hover:shadow-[0_8px_24px_-12px_var(--scrim)] motion-safe:hover:-translate-y-0.5',
        className,
      )}
      {...rest}
    />
  );
}
