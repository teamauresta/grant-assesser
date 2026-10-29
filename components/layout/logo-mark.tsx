import { cn } from '@/lib/cn';

/**
 * The compass-and-rising-needle mark: a eucalyptus tile with a sand compass. Decorative: the brand
 * name sits beside it. Same geometry as app/icon.svg. It uses --logo (the light --brand) in both
 * themes so the compass (--on-logo) keeps 3:1.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={cn('size-7 shrink-0', className)}>
      <rect width="32" height="32" rx="7" fill="var(--logo)" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="var(--on-logo)" strokeWidth="1.75" />
      <path d="M20.6 11.4 L17.6 17.6 L11.4 20.6 L14.4 14.4 Z" fill="var(--on-logo)" />
      <circle cx="16" cy="16" r="1.1" fill="var(--logo)" />
    </svg>
  );
}
