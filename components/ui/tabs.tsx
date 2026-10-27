'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import * as m from 'motion/react-m';
import { cn } from '@/lib/cn';
import { focusRing } from './focus-ring';

export type TabItem<V extends string> = { value: V; label: ReactNode; content: ReactNode };

export type TabsProps<V extends string> = {
  /** Accessible name for the tab list, e.g. "Plan views". */
  label: string;
  tabs: readonly TabItem<V>[];
  /** Controlled selection. Omit to let the component manage it. */
  value?: V;
  defaultValue?: V;
  onValueChange?: (value: V) => void;
  className?: string;
};

/**
 * WAI-ARIA tabs: arrow keys move and select (automatic activation), Home/End jump to the ends.
 * The selected tab's underline is one shared layout element, so it slides to the new tab.
 */
export function Tabs<V extends string>({ label, tabs, value, defaultValue, onValueChange, className }: TabsProps<V>) {
  const id = useId();
  const [inner, setInner] = useState<V | undefined>(defaultValue ?? tabs[0]?.value);
  const selected = value ?? inner;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (v: V) => {
    if (value === undefined) setInner(v);
    onValueChange?.(v);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    refs.current[next]?.focus();
    select(tabs[next].value);
  };

  return (
    <div className={className}>
      {/* The baseline is an inset shadow, not a border: the list scrolls sideways, which clips anything
          outside its padding box, and the indicator has to sit on top of the line, not below it. */}
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--border)]">
        {tabs.map((t, i) => {
          const isSelected = t.value === selected;
          return (
            <button
              key={t.value}
              ref={(el) => { refs.current[i] = el; }}
              id={`${id}-tab-${t.value}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`${id}-panel-${t.value}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => select(t.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'relative min-h-11 whitespace-nowrap rounded-t-md px-3 text-sm transition-colors duration-150',
                isSelected ? 'font-semibold text-fg' : 'text-muted-fg hover:text-fg',
                focusRing,
              )}
            >
              {t.label}
              {isSelected && (
                <m.span
                  layoutId={`${id}-indicator`}
                  data-tab-indicator=""
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-accent"
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              )}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div
          key={t.value}
          id={`${id}-panel-${t.value}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${t.value}`}
          hidden={t.value !== selected}
          tabIndex={0}
          className={cn('pt-4', focusRing, 'rounded-md')}
        >
          {t.value === selected && t.content}
        </div>
      ))}
    </div>
  );
}
