import { UserRound } from 'lucide-react';
import { PERSONAS, type Persona, type Program } from '@/lib/schema';
import { PERSONAS_INFO } from '@/lib/personas';

/**
 * Persona-specific advice. With a persona (from the stored profile, wired in Task 13) it is one callout
 * for that persona; without one, every recorded note is listed so nothing in the data is hidden.
 */
export function PersonaNotes({ personas, persona }: { personas: Program['personas']; persona?: Persona }) {
  const note = persona ? personas[persona] : undefined;
  if (persona) {
    if (!note) return null;
    return (
      <aside aria-label={`Advice for ${PERSONAS_INFO[persona].label} companies`} className="flex gap-3 rounded-lg border border-border bg-surface p-4">
        <UserRound aria-hidden="true" size={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent" />
        <p>
          <span className="font-semibold">For {PERSONAS_INFO[persona].label} companies: </span>
          {note}
        </p>
      </aside>
    );
  }

  const entries = PERSONAS.filter((p) => personas[p]).map((p) => [p, personas[p]!] as const);
  if (!entries.length) return null;
  return (
    <aside aria-labelledby="persona-notes-heading" className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <h2 id="persona-notes-heading" className="flex items-center gap-2 text-base">
        <UserRound aria-hidden="true" size={20} strokeWidth={1.5} className="text-accent" />
        Advice by situation
      </h2>
      <dl className="flex flex-col gap-2">
        {entries.map(([p, text]) => (
          <div key={p} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="shrink-0 text-sm font-medium sm:w-28">{PERSONAS_INFO[p].label}</dt>
            <dd className="text-sm text-muted-fg">{text}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
