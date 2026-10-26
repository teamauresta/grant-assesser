'use client';

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { PERSONAS } from '@/lib/schema';
import { PERSONAS_INFO } from '@/lib/personas';
import { useWorkspace } from '@/lib/store/use-workspace';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';

/**
 * The three persona cards. Choosing one stores the persona, then opens the assessment; the query
 * parameter is kept so the wizard can pre-select it even if the store has not loaded yet.
 */
export function PersonaCards() {
  const current = useWorkspace((s) => (s.ready ? s.ws.profile.persona : undefined));
  const setProfile = useWorkspace((s) => s.setProfile);
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {PERSONAS.map((value) => {
        const { label, description } = PERSONAS_INFO[value];
        const selected = current === value;
        return (
          <li key={value}>
            <Link
              href={`/assess/?persona=${value}`}
              onClick={() => setProfile({ persona: value })}
              className={cn(
                'group flex h-full min-h-32 flex-col gap-2 rounded-lg border bg-surface p-6',
                'transition-[border-color] duration-150 hover:border-accent',
                selected ? 'border-accent' : 'border-border',
                focusRing,
              )}
            >
              <span className="flex items-center justify-between gap-2 text-xl font-semibold tracking-tight">
                {label}
                <ArrowRight
                  aria-hidden="true"
                  size={20}
                  strokeWidth={1.5}
                  className="shrink-0 text-muted-fg transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent"
                />
              </span>
              <span className="text-sm text-muted-fg">{description}</span>
              {selected && (
                <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-medium text-accent">
                  <Check aria-hidden="true" size={16} strokeWidth={1.5} />
                  Your current persona
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
