'use client';

import type { Profile, Program } from '@/lib/schema';
import { formatDate } from '@/lib/dates';
import { useProgramStatus } from '@/lib/programs/use-status';
import { useDeadlineProfile } from '@/lib/store/use-workspace';
import { StatusPill } from '@/components/ui/status-pill';
import { DeadlineText } from './deadline-text';
import { StaleBadge } from './stale-badge';

/** Without a `profile` prop, the stored profile is used (it matters for profile-relative deadlines). */
type Props = { program: Program; profile?: Profile };

function useStatus(program: Program, profile?: Profile) {
  const stored = useDeadlineProfile();
  return useProgramStatus(program, profile ?? stored);
}

/** Status pill: the declared state in static HTML, refined to the derived state once mounted. */
export function ProgramStatusPill({ program, profile }: Props) {
  const status = useStatus(program, profile);
  return <StatusPill declared={program.status.state} derived={status?.state} daysToClose={status?.daysToClose} />;
}

/** The next upcoming deadline (close or milestone), worked out on the client. */
export function NextDeadline({ program, profile }: Props) {
  const status = useStatus(program, profile);
  if (!program.deadlines.length) return <span>No fixed deadline</span>;
  if (!status) return <span aria-hidden="true" className="text-muted-fg">…</span>;
  if (!status.nextDeadline) return <span>None upcoming</span>;
  return <DeadlineText deadline={status.nextDeadline} />;
}

/** "Verified 26 Oct 2026", plus a "Needs re-check" badge when the check is stale. */
export function VerifiedNote({ program }: { program: Program }) {
  const status = useProgramStatus(program);
  const { lastVerified } = program.verification;
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-muted-fg">
      <span>
        Verified <time dateTime={lastVerified} className="num">{formatDate(lastVerified)}</time>
      </span>
      {status?.stale && <StaleBadge />}
    </p>
  );
}
