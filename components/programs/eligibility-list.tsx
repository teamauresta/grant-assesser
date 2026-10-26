'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, CircleCheck, CircleDot, CircleHelp, CircleX, type LucideIcon } from 'lucide-react';
import type { GateRef, Profile } from '@/lib/schema';
import { describeGate, evaluateGates, type GateOutcome, type GateResult } from '@/lib/gates';
import { useNow } from '@/lib/use-now';
import { cn } from '@/lib/cn';
import { buttonClasses } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const OUTCOME: Record<GateOutcome, { icon: LucideIcon; text: string }> = {
  pass: { icon: CircleCheck, text: 'Met' },
  fail: { icon: CircleX, text: 'Not met' },
  unknown: { icon: CircleHelp, text: 'Unknown' },
};

export type EligibilityListProps = {
  gates: GateRef[];
  /** The stored assessment answers. Without one, the list shows what is checked and invites an assessment. */
  profile?: Profile;
};

/**
 * A program's eligibility checks. With a profile, each check shows met / not met / unknown (icon and
 * text), its reason and how to fix it. Evaluation needs "now", so it happens after mount.
 */
export function EligibilityList({ gates, profile }: EligibilityListProps) {
  const now = useNow();
  const results = useMemo<GateResult[] | null>(
    () => (profile && now ? evaluateGates(gates, profile, { now }) : null),
    [gates, profile, now],
  );

  if (!gates.length) {
    return <p className="text-muted-fg">No specific eligibility checks are recorded. Read the official guidelines before applying.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-fg">Each check is required unless marked otherwise.</p>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {gates.map((ref, i) => {
          const { label, severity, note } = describeGate(ref);
          const r = results?.[i];
          const { icon: Icon, text } = r ? OUTCOME[r.result] : { icon: CircleDot, text: undefined };
          return (
            <li key={i} className="flex gap-3 px-4 py-3">
              <Icon aria-hidden="true" size={20} strokeWidth={1.5} className={cn('mt-0.5 shrink-0', r ? 'text-fg' : 'text-muted-fg')} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">{label}</span>
                  {severity === 'soft' && <Badge>Helps, not required</Badge>}
                  {text && <span className="text-sm font-medium">{text}</span>}
                </div>
                {r ? (
                  <>
                    <p className="text-sm text-muted-fg">{r.reason}</p>
                    {r.fix && r.result !== 'pass' && <p className="text-sm"><span className="font-medium">To fix: </span>{r.fix}</p>}
                  </>
                ) : (
                  note && <p className="text-sm text-muted-fg">{note}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {!profile && (
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-fg">Answer a few questions to see which of these you meet.</p>
          <Link href="/assess/" className={buttonClasses({ variant: 'secondary' })}>
            Take the assessment to check your eligibility
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
          </Link>
        </div>
      )}
    </div>
  );
}
