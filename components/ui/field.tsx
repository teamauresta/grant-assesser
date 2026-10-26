'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { focusRing } from './focus-ring';

/** Props a Field hands to its control so the label, help and error are wired up. */
export type FieldControlProps = {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  required?: boolean;
};

export type FieldProps = {
  label: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

export function Field({ label, help, error, required, className, children }: FieldProps) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="font-normal text-muted-fg"> (required)</span>}
      </label>
      {help && <HelpText id={helpId}>{help}</HelpText>}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, required })}
      {error && <ErrorText id={errorId}>{error}</ErrorText>}
    </div>
  );
}

export function HelpText({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="text-sm text-muted-fg">
      {children}
    </p>
  );
}

export function ErrorText({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm text-danger">
      <CircleAlert aria-hidden="true" size={16} strokeWidth={1.5} className="mt-[3px] shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** 16px text so iOS does not zoom on focus; 44px tall; strong border so the control's edge meets 3:1. */
export const controlClasses = cn(
  'w-full min-h-11 rounded-md border border-border-strong bg-bg px-3 py-2 text-base text-fg',
  'placeholder:text-muted-fg disabled:cursor-not-allowed disabled:opacity-50',
  'aria-invalid:border-danger',
  focusRing,
);

export function Input({ className, ...rest }: ComponentProps<'input'>) {
  return <input className={cn(controlClasses, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={cn(controlClasses, 'min-h-24', className)} {...rest} />;
}

export function Select({ className, ...rest }: ComponentProps<'select'>) {
  return <select className={cn(controlClasses, className)} {...rest} />;
}
