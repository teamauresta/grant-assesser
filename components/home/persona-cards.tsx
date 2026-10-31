'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import type { IconName } from '@/lib/art';
import { PERSONAS, type Persona } from '@/lib/schema';
import { PERSONAS_INFO } from '@/lib/personas';
import { useWorkspace } from '@/lib/store/use-workspace';
import { cn } from '@/lib/cn';
import { Art } from '@/components/ui/art';
import { focusRing } from '@/components/ui/focus-ring';
import { SageIcon } from '@/components/ui/sage-icon';
import { useSpotlight } from '@/components/ui/spotlight';

const ICONS: Record<Persona, IconName> = { bootstrapped: 'sprout', 'pre-raise': 'target', 'vc-backed': 'rocket' };

/**
 * The three persona cards, each in its own brand colour (icon badge, hover glow), with a cursor
 * spotlight; the platypus waves from the first one (Billabong design doc, section 8). Choosing one
 * stores the persona, then opens the assessment; the query parameter is kept so the wizard can
 * pre-select it even if the store has not loaded yet.
 */
export function PersonaCards() {
  const current = useWorkspace((s) => (s.ready ? s.ws.profile.persona : undefined));
  const setProfile = useWorkspace((s) => s.setProfile);
  const listRef = useSpotlight<HTMLUListElement>();
  return (
    <ul ref={listRef} className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {PERSONAS.map((value, i) => {
        const { label, description, tone } = PERSONAS_INFO[value];
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
                // The interactive card's neutral lift (Card interactive); the persona tone stays on the icon.
                'transition-[border-color,translate,box-shadow] duration-150 hover:border-accent hover:shadow-[0_8px_24px_-12px_var(--scrim)] motion-safe:hover:-translate-y-0.5',
                selected ? 'border-accent' : 'border-border',
                focusRing,
              )}
            >
              {/* Decorative: the link's name must still start with the persona label. The platypus on
                  the first card sits at the end of the badge row, 16px taller than the 48px badge and
                  centred on it, its overhang taken by negative margins (into the card's padding
                  above, the row's margin and gap below), so every card's label stays on one line. A div,
                  since the art's box is a div (no block inside a span). */}
              <div aria-hidden="true" className="mb-1 flex items-center justify-between gap-4">
                <span className="flex size-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--tone)_14%,transparent)]">
                  <SageIcon name={ICONS[value]} size={32} />
                </span>
                {i === 0 && <Art name="platypus-wave" alt="" sizes="64px" className="-my-3 w-16 shrink-0" />}
              </div>
              <span className="flex items-center justify-between gap-2 text-xl font-semibold tracking-tight">
                {label}
                <ArrowRight
                  aria-hidden="true"
                  size={20}
                  className="shrink-0 text-muted-fg transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent"
                />
              </span>
              <span className="text-sm text-muted-fg">{description}</span>
              {selected && (
                <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-medium text-accent">
                  <Check aria-hidden="true" size={16} />
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
