import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { focusRing } from './focus-ring';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

// Chunky buttons (docs/plans/2026-10-31-billabong-design.md, section 4): primary, secondary and danger
// carry the `ledge` utility (app/globals.css), a 3px bottom edge in the border's colour, a darker
// shade of the button. Ghost buttons are flat.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary border border-primary-ledge ledge font-semibold hover:brightness-105',
  secondary: 'bg-surface text-fg border border-border-strong ledge font-medium hover:bg-neutral-bg',
  ghost: 'bg-transparent text-fg border border-transparent font-medium hover:bg-neutral-bg',
  // Destructive confirmations only (e.g. the Remove button inside a confirmation dialog).
  danger: 'bg-danger text-on-danger border border-danger-ledge ledge font-medium hover:brightness-105',
};

const SIZES: Record<ButtonSize, string> = {
  // md is the default and meets the 44px touch target; sm is for dense desktop toolbars only.
  md: 'min-h-11 px-4 text-sm',
  sm: 'min-h-9 px-3 text-sm',
};

// Square buttons that hold only an icon (they still need an accessible name).
const ICON_SIZES: Record<ButtonSize, string> = { md: 'size-11', sm: 'size-9' };

/** Classes for anything that should look like a button, e.g. a `next/link` call to action. */
export function buttonClasses({
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean; className?: string } = {}): string {
  return cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-md',
    // Pressed buttons with a ledge move down as it shrinks (the press is in the `ledge` utility, and
    // nothing moves under reduced motion).
    'transition-[opacity,background-color,border-color,filter,translate,border-bottom-width] duration-150 ease-out',
    'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
    focusRing,
    VARIANTS[variant],
    iconOnly ? ICON_SIZES[size] : SIZES[size],
    className,
  );
}

export type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
};

export function Button({ variant, size, iconOnly, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, iconOnly, className })} {...rest} />;
}
