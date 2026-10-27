import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * The compass-and-rising-needle mark in the Liftoff gradient. Decorative: the brand name sits beside it.
 * Same geometry as app/icon.svg. It uses the light stops (--logo-*) in both themes so the white
 * compass (--on-lift) keeps 3:1. The gradient is in user space so the centre dot matches the tile.
 */
export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={cn('size-7 shrink-0', className)}>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="32" x2="32" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--logo-1)' }} />
          <stop offset="0.55" style={{ stopColor: 'var(--logo-2)' }} />
          <stop offset="1" style={{ stopColor: 'var(--logo-3)' }} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill={`url(#${id})`} />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="var(--on-lift)" strokeWidth="1.75" />
      <path d="M20.6 11.4 L17.6 17.6 L11.4 20.6 L14.4 14.4 Z" fill="var(--on-lift)" />
      <circle cx="16" cy="16" r="1.1" fill={`url(#${id})`} />
    </svg>
  );
}
