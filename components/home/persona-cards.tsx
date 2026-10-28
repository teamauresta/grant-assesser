'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Rocket, Sprout, Target, type LucideIcon } from 'lucide-react';
import { PERSONAS, type Persona } from '@/lib/schema';
import { PERSONAS_INFO } from '@/lib/personas';
import { useWorkspace } from '@/lib/store/use-workspace';
import { cn } from '@/lib/cn';
import { focusRing } from '@/components/ui/focus-ring';
import { useSpotlight } from '@/components/ui/spotlight';

const ICONS: Record<Persona, LucideIcon> = { bootstrapped: Sprout, 'pre-raise': Target, 'vc-backed': Rocket };

/**
 * The three persona cards, each in its own Liftoff stop (icon badge, hover glow), with a cursor spotlight. Choosing one stores the persona, then opens
 * the assessment; the query parameter is kept so the wizard can pre-select it even if the store has not loaded yet.
 */
export function PersonaCards() {
  const current = useWorkspace((s) => (s.ready ? s.ws.profile.persona : undefined));
  const setProfile = useWorkspace((s) => s.setProfile);
  const listRef = useSpotlight<HTMLUListElement>();
  return (
    <ul ref={listRef} className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {PERSONAS.map((value) => {
        const { label, description, tone } = PERSONAS_INFO[value];
        const Icon = ICONS[value];
        const selected = current === value;
        return (
          <li key={value}>
            <Link
              href={`/assess/?persona=${value}`}
              onClick={() => setProfile({ persona: value })}
              data-spotlight=""
              style={{ '--tone': tone } as CSSProperties}
              className={cn(
                'spotlight group flex h-full min-h-32 flex-col gap-2 rounded-lg border bg-surface p-6 [--spot-size:200px]',
                'transition-[border-color,translate,box-shadow] duration-150 hover:border-accent motion-safe:hover:-translate-y-0.5',
                'hover:shadow-[0_10px_30px_-14px_var(--tone)]',
                selected ? 'border-accent' : 'border-border',
                focusRing,
              )}
            >
              {/* Decorative: the link's name must still start with the persona label. */}
              <span aria-hidden="true" className="mb-1 flex size-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--tone)_14%,transparent)] text-[var(--tone)]">
                <Icon size={20} strokeWidth={1.5} />
              </span>
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
