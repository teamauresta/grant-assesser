'use client';

import { useEffect, useId, useRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';

export type ChipOption<V extends string> = { value: V; label: string };

export type FilterChipsProps<V extends string> = {
  label: string;
  options: readonly ChipOption<V>[];
  isPressed: (value: V) => boolean;
  onToggle: (value: V) => void;
};

/**
 * A labelled row of toggle buttons (aria-pressed). Below md the row scrolls sideways inside itself,
 * with the right edge faded to show there is more; from md up it wraps.
 */
export function FilterChips<V extends string>({ label, options, isPressed, onToggle }: FilterChipsProps<V>) {
  const id = useId();
  const scroller = useRef<HTMLDivElement>(null);

  // On mount (e.g. filters from a shared link), bring the first selected chip into view in its row.
  useEffect(() => {
    const row = scroller.current;
    const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !chip) return;
    const overflow = chip.getBoundingClientRect().right - row.getBoundingClientRect().right;
    if (overflow > 0) row.scrollLeft += overflow + 48; // clear the faded edge
  }, []);

  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-1.5 md:flex-row md:items-start md:gap-4">
      <span id={id} className="text-sm font-medium md:w-16 md:shrink-0 md:pt-3.5">
        {label}
      </span>
      <div
        ref={scroller}
        className={cn(
          '-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          '[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)]',
          'md:mx-0 md:overflow-visible md:px-0 md:[mask-image:none]',
        )}
      >
        <ul className="flex w-max gap-2 py-1 pr-10 md:w-auto md:flex-wrap md:pr-0">
          {options.map(({ value, label: text }) => {
            const pressed = isPressed(value);
            return (
              <li key={value}>
                <button
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => onToggle(value)}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium',
                    'transition-colors duration-150',
                    // Pressed is filled with --fg: the clearest state in both themes (an amber fill is
                    // 1.7:1 on the light page). tests/lib/tokens.test.ts checks the pairs.
                    pressed
                      ? 'border-fg bg-fg text-bg'
                      : 'border-border-strong bg-surface text-fg hover:bg-neutral-bg',
                    focusRing,
                  )}
                >
                  {/* The state never rests on colour alone: aria-pressed, and this check. */}
                  {pressed && <Check aria-hidden="true" size={16} strokeWidth={1.5} className="-ml-1" />}
                  {text}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
