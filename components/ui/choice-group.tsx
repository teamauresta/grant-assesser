'use client';

import { useId, type ReactNode } from 'react';
import { Check } from 'lucide-react';
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
  /**
   * How loudly a checked card shows: 'strong' (default) adds a 2px inset ring to the accent border;
   * 'quiet' keeps the accent border and the check icon only, for lists where most options are checked
   * (the report builder's sections), so they do not outshout the page.
   */
  emphasis?: 'strong' | 'quiet';
  className?: string;
};

export type ChoiceGroupProps<V extends string> =
  | (Common<V> & { type: 'radio'; value: V | undefined; onChange: (value: V) => void })
  | (Common<V> & { type: 'checkbox'; value: readonly V[]; onChange: (value: V[]) => void });

const COLUMNS = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' } as const;

/**
 * Radio or checkbox options shown as cards. Native inputs keep keyboard and screen reader behaviour.
 *
 * Cards are --surface, outlined in --border-strong (3:1 on --surface and --bg). A checked card has an
 * --accent border, a 2px inset ring and a check icon, so the state never rests on colour alone: its
 * edge is 3px instead of 1px and the icon appears (design doc section 11, Task 6). The ring is inset
 * so it stays clear of the keyboard focus outline, 2px outside the card: checked and focused remain
 * two different marks. emphasis="quiet" drops the ring (the border and icon stay). Hover is --bg (on
 * --neutral-bg the outline would fall under 3:1). The state comes from the value, not :has(:checked),
 * as the inputs are controlled. Each input is named by its label text and described by its
 * description, so neither is read twice.
 */
export function ChoiceGroup<V extends string>(props: ChoiceGroupProps<V>) {
  const { legend, name, options, help, error, columns = 1, emphasis = 'strong', className } = props;
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
          const labelId = `${optionId}-label`;
          const descId = o.description ? `${optionId}-desc` : undefined;
          const checked = isChecked(o.value);
          return (
            <label
              key={o.value}
              htmlFor={optionId}
              className={cn(
                'flex min-h-11 items-start gap-3 rounded-lg border bg-surface p-3',
                'transition-[border-color,background-color,box-shadow] duration-150',
                checked ? cn('border-accent', emphasis === 'strong' && 'ring-2 ring-inset ring-accent') : 'border-border-strong',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent',
                o.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-bg',
              )}
            >
              <input
                id={optionId}
                type={props.type}
                name={name}
                value={o.value}
                checked={checked}
                disabled={o.disabled}
                // Named by the label text alone: the description sits inside the label too, and a name
                // from the whole label would read it before aria-describedby read it again.
                aria-labelledby={labelId}
                aria-describedby={descId}
                onChange={(e) => toggle(o.value, e.currentTarget.checked)}
                className="mt-1 size-4 shrink-0 accent-accent outline-none"
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span id={labelId} className="text-sm font-medium">{o.label}</span>
                {o.description && (
                  <span id={descId} className="text-sm text-muted-fg">
                    {o.description}
                  </span>
                )}
              </span>
              {/* A fixed slot, so the label does not reflow when the icon appears. */}
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-accent">
                {checked && <Check aria-hidden="true" size={16} />}
              </span>
            </label>
          );
        })}
      </div>
      {error && <ErrorText id={errorId}>{error}</ErrorText>}
    </fieldset>
  );
}
