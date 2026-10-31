import { CalendarClock } from 'lucide-react';
import type { ResolvedDeadline } from '@/lib/status';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/cn';

/** "Closes 15 Nov 2026" for a close, or "{label} 30 Apr 2027" for a milestone. Dates in mono. */
export function DeadlineText({ deadline, className }: { deadline: ResolvedDeadline; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <CalendarClock aria-hidden="true" size={16} strokeWidth={1.5} className="shrink-0" />
      <span>
        {deadline.kind === 'close' ? 'Closes' : deadline.label}{' '}
        <time dateTime={deadline.date} className="num">{formatDate(deadline.date)}</time>
        {deadline.time && <span className="num">, {deadline.time}</span>}
      </span>
    </span>
  );
}
