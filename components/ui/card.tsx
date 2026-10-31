import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'article' | 'section' | 'li';
  padding?: 'none' | 'md' | 'lg';
  /**
   * 'surface' (default): --surface with a solid --border outline. 'quiet': no fill and a dashed
   * outline, for items that stay listed but are set aside (Not a fit results). A prop rather than a
   * className, since cn() does not merge classes and a caller's fill would fight the card's own.
   */
  tone?: 'surface' | 'quiet';
  /** Adds a hover border, shadow and 2px lift for cards that contain a full-card link. */
  interactive?: boolean;
};

const PADDING = { none: '', md: 'p-4', lg: 'p-6' } as const;
const TONES = { surface: 'bg-surface', quiet: 'border-dashed' } as const;

export function Card({ as: Tag = 'div', padding = 'md', tone = 'surface', interactive = false, className, ...rest }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-lg border border-border',
        TONES[tone],
        PADDING[padding],
        interactive && 'relative transition-[border-color,translate,box-shadow] duration-150 hover:border-border-strong hover:shadow-[0_8px_24px_-12px_var(--scrim)] motion-safe:hover:-translate-y-0.5',
        className,
      )}
      {...rest}
    />
  );
}
