'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './button';
import { focusRing } from './focus-ring';

type MenuItemBase = { id: string; label: ReactNode; icon?: LucideIcon; disabled?: boolean };
export type MenuItem =
  | (MenuItemBase & { onSelect: () => void; href?: never })
  | (MenuItemBase & { href: string; download?: string | true; external?: boolean; onSelect?: never });

export type MenuProps = {
  /** Visible trigger text, e.g. "Move to…" or "Add to calendar". */
  label: ReactNode;
  items: readonly MenuItem[];
  /** Extra context for screen readers when the visible label is ambiguous, e.g. "Move R&D Tax Incentive to…". */
  'aria-label'?: string;
  icon?: LucideIcon;
  align?: 'start' | 'end';
  /** Muted text shown below the items and used as the menu's description, e.g. a caveat. */
  footer?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon-only trigger: a square button without the chevron. Needs `aria-label` (or an sr-only label). */
  iconOnly?: boolean;
  className?: string;
};

/** Menu button (WAI-ARIA menu pattern): arrows move, Home/End jump, Escape closes and returns focus. */
export function Menu({ label, items, icon: Icon, align = 'start', variant = 'secondary', size = 'md', iconOnly = false, footer, className, ...aria }: MenuProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);

  useEffect(() => {
    if (open) itemRefs.current[focusIndex]?.focus();
  }, [open, focusIndex]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const openAt = (index: number | undefined) => {
    if (index === undefined) return;
    setFocusIndex(index);
    setOpen(true);
  };

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); openAt(enabled[0]); }
    if (e.key === 'ArrowUp') { e.preventDefault(); openAt(enabled.at(-1)); }
  };

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const pos = enabled.indexOf(focusIndex);
    const move = (to: number | undefined) => { e.preventDefault(); if (to !== undefined) setFocusIndex(to); };
    if (e.key === 'ArrowDown') move(enabled[(pos + 1) % enabled.length]);
    else if (e.key === 'ArrowUp') move(enabled[(pos - 1 + enabled.length) % enabled.length]);
    else if (e.key === 'Home') move(enabled[0]);
    else if (e.key === 'End') move(enabled.at(-1));
    else if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'Tab') setOpen(false);
  };

  const itemClass = (disabled?: boolean) =>
    cn(
      'flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-fg',
      // The popover is --surface, so a hovered or focused item takes the window bar's neutral fill.
      disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-neutral-bg focus:bg-neutral-bg',
      focusRing,
      'focus-visible:outline-offset-0',
    );

  return (
    <div ref={rootRef} className={cn('relative inline-block', className)}>
      <button
        ref={triggerRef}
        id={`${id}-trigger`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        aria-label={aria['aria-label']}
        onClick={() => (open ? close(false) : openAt(enabled[0]))}
        onKeyDown={onTriggerKeyDown}
        className={buttonClasses({ variant, size, iconOnly })}
      >
        {Icon && <Icon aria-hidden="true" size={16} strokeWidth={1.5} />}
        {label}
        {!iconOnly && <ChevronDown aria-hidden="true" size={16} strokeWidth={1.5} className="text-muted-fg" />}
      </button>
      {open && (
        <div
          className={cn(
            // A --surface popover lifted by the window's drop (Billabong design doc section 11, Tasks 8
            // and 9): shadow-popover, without the window shadow's 1px line, which doubled its bottom border.
            'absolute top-full z-50 mt-1 flex w-max min-w-56 max-w-[min(20rem,calc(100vw-2rem))] flex-col rounded-lg border border-border bg-surface p-1 shadow-popover',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          <div
            id={`${id}-menu`}
            role="menu"
            aria-labelledby={`${id}-trigger`}
            aria-describedby={footer ? `${id}-footer` : undefined}
            onKeyDown={onMenuKeyDown}
            className="flex flex-col gap-0.5"
          >
            {items.map((it, i) => {
              const content = (
                <>
                  {it.icon && <it.icon aria-hidden="true" size={16} strokeWidth={1.5} className="shrink-0 text-muted-fg" />}
                  <span>{it.label}</span>
                </>
              );
              const common = {
                ref: (el: HTMLElement | null) => { itemRefs.current[i] = el; },
                role: 'menuitem',
                tabIndex: -1,
                className: itemClass(it.disabled),
              } as const;
              if (it.href !== undefined) {
                return (
                  <a
                    key={it.id}
                    {...common}
                    href={it.disabled ? undefined : it.href}
                    aria-disabled={it.disabled || undefined}
                    download={it.download === true ? '' : it.download}
                    target={it.external ? '_blank' : undefined}
                    rel={it.external ? 'noopener noreferrer' : undefined}
                    onClick={() => close(false)}
                  >
                    {content}
                  </a>
                );
              }
              return (
                <button
                  key={it.id}
                  {...common}
                  type="button"
                  disabled={it.disabled}
                  onClick={() => { it.onSelect(); close(true); }}
                >
                  {content}
                </button>
              );
            })}
          </div>
          {footer && <p id={`${id}-footer`} className="mt-1 border-t border-border px-3 pb-2 pt-2 text-xs text-muted-fg">{footer}</p>}
        </div>
      )}
    </div>
  );
}
