import Link from 'next/link';
import { Ban } from 'lucide-react';
import type { Program } from '@/lib/schema';
import type { StatusInfo } from '@/lib/status';
import { formatDate } from '@/lib/dates';
import { formatBenefit, LEVEL_LABELS, TYPE_LABELS } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { DeadlineText } from './deadline-text';
import { StaleBadge } from './stale-badge';

export type ProgramCardProps = {
  program: Program;
  /** Derived status; omit before the client knows "now" to show the declared state. */
  status?: StatusInfo;
  headingLevel?: 'h2' | 'h3';
  /**
   * Set when the stored profile rules the program out. The card stays listed but is de-emphasised:
   * a quiet card (no fill, dashed outline, as on the results page) with muted text, plus an icon and
   * this one-line reason in full-contrast text.
   */
  notFitReason?: string;
};

export function ProgramCard({ program, status, headingLevel: Heading = 'h2', notFitReason }: ProgramCardProps) {
  const deadline = status?.nextDeadline;
  const muted = notFitReason !== undefined;
  return (
    <Card
      as="article"
      interactive
      emphasis={muted ? 'quiet' : 'default'}
      className={cn(
        'flex h-full flex-col gap-2 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-accent',
        muted && 'text-muted-fg',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Heading className={cn('text-base leading-snug', muted ? 'font-medium' : 'font-semibold')}>
          {/* The ::after overlay makes the whole card the link target. */}
          <Link href={`/programs/${program.slug}/`} className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none">
            {program.name}
          </Link>
        </Heading>
        <StatusPill declared={program.status.state} derived={status?.state} daysToClose={status?.daysToClose} className="shrink-0" />
      </div>
      {muted && (
        <p className="flex items-start gap-1.5 text-sm text-fg">
          <Ban aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          <span><span className="font-medium">Not a fit:</span> {notFitReason}</span>
        </p>
      )}
      <p className="text-sm text-muted-fg">
        {program.provider} · {LEVEL_LABELS[program.level]} · {TYPE_LABELS[program.type]}
      </p>
      <p className="num text-sm">{formatBenefit(program.benefit)}</p>
      <p className="line-clamp-2 text-sm">{program.content.summary}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-fg">
        {deadline && <DeadlineText deadline={deadline} className={muted ? undefined : 'text-fg'} />}
        {status?.stale ? (
          <StaleBadge />
        ) : (
          <span>
            Verified <time dateTime={program.verification.lastVerified} className="num">{formatDate(program.verification.lastVerified)}</time>
          </span>
        )}
      </div>
    </Card>
  );
}
