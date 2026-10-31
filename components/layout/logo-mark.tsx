import { Art } from '@/components/ui/art';
import { cn } from '@/lib/cn';

/**
 * The logo: the owner's platypus emblem (the platypus in glasses with a compass, in a gold ring), a
 * 32px picture from the art pipeline (`logo-emblem` in lib/art.ts; AVIF then WebP at 1x to 4x).
 * Decorative: the live "Grant Navigator" text sits beside it. Eager, since it is in the top bar on
 * every page, but without fetch priority, so it never competes with the hero. The lockup's baked
 * wordmark is not used: it is dark green and nearly invisible on the dark theme.
 */
export function LogoMark({ className }: { className?: string }) {
  return <Art name="logo-emblem" alt="" sizes="32px" eager className={cn('size-8 shrink-0', className)} />;
}
