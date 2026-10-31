import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { focusRing } from './focus-ring';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

// Chunky buttons (docs/plans/2026-10-31-billabong-design.md, section 4): primary, secondary and danger
// have a 3px bottom edge (`border-b-3`) in the border's colour, a darker shade of the button, and the
// `ledge` utility (app/globals.css), which is the press. Ghost buttons are flat.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary border border-b-3 border-primary-ledge ledge font-semibold hover:brightness-105',
  secondary: 'bg-surface text-fg border border-b-3 border-border-strong ledge font-medium hover:bg-neutral-bg',
  ghost: 'bg-transparent text-fg border border-transparent font-medium hover:bg-neutral-bg',
  // Destructive confirmations only (e.g. the Remove button inside a confirmation dialog).
  danger: 'bg-danger text-on-danger border border-b-3 border-danger-ledge ledge font-medium hover:brightness-105',
};

/**
 * A native file input's button (`::file-selector-button`) drawn as a md secondary button: the `file:`
 * twins of the secondary variant's colour, border and hover classes, and of md's size (the settings
 * import). No press: the pseudo-element cannot move. A literal so Tailwind's scan sees every class;
 * tests/components/button.test.tsx keeps it in step with VARIANTS.secondary.
 */
export const FILE_BUTTON_CLASSES =
  'file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border file:border-b-3 file:border-solid file:border-border-strong file:bg-surface file:px-4 file:text-sm file:font-medium file:text-fg hover:file:bg-neutral-bg';

const SIZES: Record<ButtonSize, string> = {
  // md is the default and meets the 44px touch target; sm is for dense desktop toolbars only; lg is
  // for the hero's calls to action.
  lg: 'min-h-12 px-6 text-base',
  md: 'min-h-11 px-4 text-sm',
  sm: 'min-h-9 px-3 text-sm',
};

// Square buttons that hold only an icon (they still need an accessible name).
const ICON_SIZES: Record<ButtonSize, string> = { lg: 'size-12', md: 'size-11', sm: 'size-9' };

/**
 * Classes for anything that should look like a button, e.g. a `next/link` call to action.
 *
 * `className` is for layout only: margin, flex, self, width, shrink (and the hero's `glow-brand`).
 * Never colour, size, padding, text size, border or cursor: cn() does not resolve Tailwind conflicts,
 * so such a class fights the button's own and the CSS order decides. Use a variant or size instead.
 * tests/components/button.test.tsx scans the call sites.
 */
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

/** A button. `className` is for layout only; see buttonClasses(). */
export type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
};

export function Button({ variant, size, iconOnly, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, iconOnly, className })} {...rest} />;
}
