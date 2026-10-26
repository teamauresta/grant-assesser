'use client';

import { useState } from 'react';
import type { Profile } from '@/lib/schema';
import { CREDIT_PROVIDERS, LIMITS, ProfileSchema } from '@/lib/schema';
import { hasUnsure, type OptionValue, type Question as QuestionDef } from '@/lib/assessment/questions';
import { STACK_LABELS } from '@/lib/format';
import { ChoiceGroup, type ChoiceOption } from '@/components/ui/choice-group';
import { Field, HelpText, Input, Select } from '@/components/ui/field';

const UNSURE = '__unsure';
const NONE = '__none';

export type QuestionProps = {
  question: QuestionDef;
  profile: Profile;
  /** Writes straight to the store, which saves after a short debounce. */
  onAnswer: (patch: Partial<Profile>) => void;
  /** True when the user chose "Not sure" this session (the stored answer is then empty). */
  unsure: boolean;
  onUnsureChange: (unsure: boolean) => void;
  /** Today as YYYY-MM-DD, the latest date accepted. */
  today: string;
};

function Legend({ question }: { question: QuestionDef }) {
  return (
    <>
      {question.label}
      {question.optional && <span className="font-normal text-muted-fg"> (optional)</span>}
    </>
  );
}

const key = (v: OptionValue) => String(v);

/** One assessment question, rendered for its type. Every answer is saved as it changes. */
export function Question(props: QuestionProps) {
  switch (props.question.type) {
    case 'single':
    case 'boolean':
      return <SingleChoice {...props} />;
    case 'multi':
      return <MultiChoice {...props} />;
    case 'month':
      return <MonthSelect {...props} />;
    case 'date':
      return <DateInput {...props} />;
    case 'number':
      return <CountInput {...props} />;
    case 'text':
      return <TextInput {...props} />;
    case 'credits':
      return <CreditsInputs {...props} />;
  }
}

function SingleChoice({ question: q, profile, onAnswer, unsure, onUnsureChange }: QuestionProps) {
  const options: ChoiceOption<string>[] = (q.options ?? []).map((o) => ({ value: key(o.value), label: o.label, description: o.description }));
  if (hasUnsure(q)) {
    options.push({
      value: UNSURE,
      label: 'Not sure',
      // The page intro explains that unanswered checks show as unknown; only persona needs more.
      description: q.id === 'persona' ? 'Results are ranked with balanced weights.' : undefined,
    });
  }
  const stored = profile[q.id] as OptionValue | undefined;
  const value = unsure && stored === undefined ? UNSURE : stored === undefined ? undefined : key(stored);
  const columns = q.id === 'persona' || options.length > 4 ? 2 : q.type === 'boolean' ? 3 : 1;
  return (
    <ChoiceGroup
      type="radio"
      name={q.id}
      legend={<Legend question={q} />}
      help={q.help}
      options={options}
      value={value}
      columns={columns}
      onChange={(v) => {
        if (v === UNSURE) {
          onUnsureChange(true);
          onAnswer({ [q.id]: undefined });
          return;
        }
        onUnsureChange(false);
        onAnswer({ [q.id]: q.options!.find((o) => key(o.value) === v)!.value } as Partial<Profile>);
      }}
    />
  );
}

function MultiChoice({ question: q, profile, onAnswer }: QuestionProps) {
  const options: ChoiceOption<string>[] = (q.options ?? []).map((o) => ({ value: key(o.value), label: o.label, description: o.description }));
  if (q.noneOption) options.push({ value: NONE, label: q.noneOption });
  const stored = profile[q.id] as string[] | undefined;
  const value = stored === undefined ? [] : stored.length === 0 && q.noneOption ? [NONE] : stored;
  return (
    <ChoiceGroup
      type="checkbox"
      name={q.id}
      legend={<Legend question={q} />}
      help={q.help}
      options={options}
      value={value}
      columns={2}
      onChange={(next) => {
        // "None of these" is an answer (an empty list); clearing every box means "not answered".
        if (next.includes(NONE) && !value.includes(NONE)) onAnswer({ [q.id]: [] });
        else {
          const picked = next.filter((v) => v !== NONE);
          onAnswer({ [q.id]: picked.length ? picked : undefined } as Partial<Profile>);
        }
      }}
    />
  );
}

function MonthSelect({ question: q, profile, onAnswer }: QuestionProps) {
  const stored = profile[q.id] as number | undefined;
  return (
    <Field label={<Legend question={q} />} help={q.help} className="max-w-xs">
      {(control) => (
        <Select
          {...control}
          value={stored === undefined ? '' : String(stored)}
          onChange={(e) => onAnswer({ [q.id]: e.currentTarget.value ? Number(e.currentTarget.value) : undefined })}
        >
          <option value="">Not sure</option>
          {q.options!.map((o) => <option key={key(o.value)} value={key(o.value)}>{o.label}</option>)}
        </Select>
      )}
    </Field>
  );
}

/**
 * A field that keeps its own text while the user types and saves only values that parse. Blank
 * clears the answer. `parse` returns the value to save, or an error message.
 */
function useDraft<T>(initial: string, parse: (text: string) => { value: T | undefined } | { error: string }, save: (v: T | undefined) => void) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string>();
  const onChange = (next: string) => {
    setText(next);
    const r = parse(next.trim());
    if ('error' in r) { setError(r.error); return; }
    setError(undefined);
    save(r.value);
  };
  return { text, error, onChange };
}

function DateInput({ question: q, profile, onAnswer, today }: QuestionProps) {
  const field = ProfileSchema.shape[q.id];
  const draft = useDraft<string>(
    (profile[q.id] as string | undefined) ?? '',
    (t) => {
      if (!t) return { value: undefined };
      if (!field.safeParse(t).success) return { error: 'Enter a real date, for example 27/04/2025.' };
      if (t > today) return { error: 'Enter a date that is not in the future.' };
      return { value: t };
    },
    (v) => onAnswer({ [q.id]: v }),
  );
  return (
    <Field label={<Legend question={q} />} help={q.help} error={draft.error} className="max-w-xs">
      {(control) => <Input {...control} type="date" max={today} value={draft.text} onChange={(e) => draft.onChange(e.currentTarget.value)} />}
    </Field>
  );
}

const WHOLE = /^\d+$/;

function CountInput({ question: q, profile, onAnswer }: QuestionProps) {
  const stored = profile[q.id] as number | undefined;
  const draft = useDraft<number>(
    stored === undefined ? '' : String(stored),
    (t) => (!t ? { value: undefined } : WHOLE.test(t) ? { value: Number(t) } : { error: 'Enter a whole number, or 0 if none.' }),
    (v) => onAnswer({ [q.id]: v }),
  );
  return (
    <Field label={<Legend question={q} />} help={q.help} error={draft.error} className="max-w-xs">
      {(control) => (
        <Input {...control} type="text" inputMode="numeric" autoComplete="off" value={draft.text} onChange={(e) => draft.onChange(e.currentTarget.value)} />
      )}
    </Field>
  );
}

function TextInput({ question: q, profile, onAnswer }: QuestionProps) {
  return (
    <Field label={<Legend question={q} />} help={q.help}>
      {(control) => (
        <Input
          {...control}
          type="text"
          maxLength={LIMITS.name}
          autoComplete="organization"
          value={(profile[q.id] as string | undefined) ?? ''}
          onChange={(e) => onAnswer({ [q.id]: e.currentTarget.value || undefined })}
        />
      )}
    </Field>
  );
}

type Credits = NonNullable<Profile['priorCreditsUsd']>;
type Provider = (typeof CREDIT_PROVIDERS)[number];

function CreditsInputs({ question: q, profile, onAnswer }: QuestionProps) {
  const save = (provider: Provider, v: number | undefined) => {
    const next: Credits = { ...profile.priorCreditsUsd, [provider]: v };
    const any = CREDIT_PROVIDERS.some((p) => next[p] !== undefined);
    onAnswer({ priorCreditsUsd: any ? next : undefined });
  };
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium"><Legend question={q} /></legend>
      {q.help && <HelpText>{q.help}</HelpText>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CREDIT_PROVIDERS.map((p) => <CreditInput key={p} provider={p} initial={profile.priorCreditsUsd?.[p]} onSave={(v) => save(p, v)} />)}
      </div>
    </fieldset>
  );
}

function CreditInput({ provider, initial, onSave }: { provider: Provider; initial: number | undefined; onSave: (v: number | undefined) => void }) {
  const draft = useDraft<number>(
    initial === undefined ? '' : String(initial),
    (t) => {
      const plain = t.replace(/[,\s]/g, '').replace(/^US\$|^\$/i, '');
      if (!plain) return { value: undefined };
      return WHOLE.test(plain) ? { value: Number(plain) } : { error: 'Enter a whole dollar amount, or 0.' };
    },
    onSave,
  );
  return (
    <Field label={<>{STACK_LABELS[provider]} <span className="font-normal text-muted-fg">(US$)</span></>} error={draft.error}>
      {(control) => (
        <Input {...control} type="text" inputMode="numeric" autoComplete="off" placeholder="Unknown" value={draft.text} onChange={(e) => draft.onChange(e.currentTarget.value)} />
      )}
    </Field>
  );
}
