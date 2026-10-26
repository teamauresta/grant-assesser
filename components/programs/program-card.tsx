import Link from 'next/link';
import type { Program } from '@/lib/schema';
import type { StatusInfo } from '@/lib/status';
import { formatDate } from '@/lib/dates';
import { formatBenefit, LEVEL_LABELS, TYPE_LABELS } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { DeadlineText } from './deadline-text';
import { StaleBadge } from './stale-badge';

export type ProgramCardProps = {
  program: Program;
  /** Derived status; omit before the client knows "now" to show the declared state. */
  status?: StatusInfo;
  headingLevel?: 'h2' | 'h3';
};

export function ProgramCard({ program, status, headingLevel: Heading = 'h2' }: ProgramCardProps) {
  const deadline = status?.nextDeadline;
  return (
    <Card
      as="article"
      interactive
      className="flex h-full flex-col gap-2 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <Heading className="text-base font-semibold leading-snug">
          {/* The ::after overlay makes the whole card the link target. */}
          <Link href={`/programs/${program.slug}/`} className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none">
            {program.name}
          </Link>
        </Heading>
        <StatusPill declared={program.status.state} derived={status?.state} daysToClose={status?.daysToClose} className="shrink-0" />
      </div>
      <p className="text-sm text-muted-fg">
        {program.provider} · {LEVEL_LABELS[program.level]} · {TYPE_LABELS[program.type]}
      </p>
      <p className="num font-mono text-sm">{formatBenefit(program.benefit)}</p>
      <p className="line-clamp-2 text-sm">{program.content.summary}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-fg">
        {deadline && <DeadlineText deadline={deadline} className="text-fg" />}
        {status?.stale ? (
          <StaleBadge />
        ) : (
          <span>
            Verified <time dateTime={program.verification.lastVerified} className="num font-mono">{formatDate(program.verification.lastVerified)}</time>
          </span>
        )}
      </div>
    </Card>
  );
}
