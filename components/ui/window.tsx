import { useId, type ReactNode } from 'react';
import { Minus, Square, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type WindowProps = {
  /** The window's title: the heading that names the region. */
  title: ReactNode;
  /** The title's heading level (h2 by default). */
  as?: 'h2' | 'h3';
  /** Real controls for the title bar (links, buttons), shown before the decorative ones. */
  actions?: ReactNode;
  /** Layout classes for the frame (margin, grid placement). */
  className?: string;
  /** Classes for the body, e.g. to change its padding. */
  bodyClassName?: string;
  children: ReactNode;
};

/**
 * A panel framed like a desktop window (Billabong design doc, section 4): a neutral title bar holding
 * the heading that names the region, over a --surface body. The minimise, maximise and close glyphs
 * are decoration only: hidden from assistive tech, and nothing in them can take focus.
 *
 * Not a client component: useId works in Server Components too, so server pages render it as HTML
 * and it ships no JavaScript of its own.
 */
export function Window({ title, as: Heading = 'h2', actions, className, bodyClassName, children }: WindowProps) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_0_var(--border),0_8px_24px_-16px_rgb(0_0_0/0.35)]', className)}
    >
      <div className="flex items-center gap-3 border-b border-border bg-neutral-bg px-3 py-2">
        <Heading id={id} className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</Heading>
        {actions}
        <span aria-hidden="true" className="flex shrink-0 items-center gap-2 text-muted-fg">
          <Minus size={16} strokeWidth={1.5} />
          <Square size={16} strokeWidth={1.5} />
          <X size={16} strokeWidth={1.5} />
        </span>
      </div>
      <div className={cn('p-4 md:p-6', bodyClassName)}>{children}</div>
    </section>
  );
}
