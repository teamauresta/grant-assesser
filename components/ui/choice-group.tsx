'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ErrorText, HelpText } from './field';

export type ChoiceOption<V extends string> = {
  value: V;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
};

type Common<V extends string> = {
  legend: ReactNode;
  name: string;
  options: readonly ChoiceOption<V>[];
  help?: ReactNode;
  error?: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
};

export type ChoiceGroupProps<V extends string> =
  | (Common<V> & { type: 'radio'; value: V | undefined; onChange: (value: V) => void })
  | (Common<V> & { type: 'checkbox'; value: readonly V[]; onChange: (value: V[]) => void });

const COLUMNS = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' } as const;

/** Radio or checkbox options shown as cards. Native inputs keep keyboard and screen reader behaviour. */
export function ChoiceGroup<V extends string>(props: ChoiceGroupProps<V>) {
  const { legend, name, options, help, error, columns = 1, className } = props;
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const isChecked = (v: V) => (props.type === 'radio' ? props.value === v : props.value.includes(v));
  const toggle = (v: V, checked: boolean) => {
    if (props.type === 'radio') props.onChange(v);
    else props.onChange(checked ? [...props.value, v] : props.value.filter((x) => x !== v));
  };

  return (
    <fieldset
      className={cn('flex flex-col gap-2', className)}
      aria-describedby={[helpId, errorId].filter(Boolean).join(' ') || undefined}
    >
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      {help && <HelpText id={helpId}>{help}</HelpText>}
      <div className={cn('grid grid-cols-1 gap-2', COLUMNS[columns])}>
        {options.map((o) => {
          const optionId = `${id}-${o.value}`;
          const descId = o.description ? `${optionId}-desc` : undefined;
          return (
            <label
              key={o.value}
              htmlFor={optionId}
              className={cn(
                'flex min-h-11 items-start gap-3 rounded-lg border border-border bg-bg p-3',
                'transition-[border-color,background-color] duration-150',
                'has-checked:border-accent has-checked:bg-surface',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent',
                o.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-border-strong',
              )}
            >
              <input
                id={optionId}
                type={props.type}
                name={name}
                value={o.value}
                checked={isChecked(o.value)}
                disabled={o.disabled}
                aria-describedby={descId}
                onChange={(e) => toggle(o.value, e.currentTarget.checked)}
                className="mt-1 size-4 shrink-0 accent-accent outline-none"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{o.label}</span>
                {o.description && (
                  <span id={descId} className="text-sm text-muted-fg">
                    {o.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {error && <ErrorText id={errorId}>{error}</ErrorText>}
    </fieldset>
  );
}
