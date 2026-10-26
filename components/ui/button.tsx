import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { focusRing } from './focus-ring';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary border border-primary hover:opacity-90',
  secondary: 'bg-bg text-fg border border-border hover:border-border-strong hover:bg-surface',
  ghost: 'bg-transparent text-fg border border-transparent hover:bg-surface',
};

const SIZES: Record<ButtonSize, string> = {
  // md is the default and meets the 44px touch target; sm is for dense desktop toolbars only.
  md: 'min-h-11 px-4 text-sm',
  sm: 'min-h-9 px-3 text-sm',
};

/** Classes for anything that should look like a button, e.g. a `next/link` call to action. */
export function buttonClasses({
  variant = 'secondary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-md font-medium',
    'transition-[opacity,background-color,border-color] duration-150',
    'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
    focusRing,
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...rest} />;
}
