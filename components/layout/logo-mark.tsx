import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * The compass-and-rising-needle mark in the Liftoff gradient. Decorative: the brand name sits beside it.
 * It uses the light stops (--logo-*) in both themes so the white compass (--on-lift) keeps 3:1.
 */
export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={cn('size-7 shrink-0', className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--logo-1)' }} />
          <stop offset="0.55" style={{ stopColor: 'var(--logo-2)' }} />
          <stop offset="1" style={{ stopColor: 'var(--logo-3)' }} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${id})`} />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="var(--on-lift)" strokeWidth="1.75" />
      <path d="M21.5 10.5 L17.6 17.6 L10.5 21.5 L14.4 14.4 Z" fill="var(--on-lift)" />
    </svg>
  );
}
