import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { focusRing } from './focus-ring';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary border border-primary hover:opacity-90',
  secondary: 'bg-bg text-fg border border-border hover:border-border-strong hover:bg-surface',
  ghost: 'bg-transparent text-fg border border-transparent hover:bg-surface',
  // Destructive confirmations only (e.g. the Remove button inside a confirmation dialog).
  danger: 'bg-danger text-on-danger border border-danger hover:opacity-90',
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
    'inline-flex select-none items-center justify-center gap-2 rounded-md font-medium',
    // Pressed buttons sink slightly; no transform when the device asks for reduced motion.
    'transition-[opacity,background-color,border-color,scale] duration-150 motion-safe:active:scale-[0.98]',
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
