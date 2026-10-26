import { CircleCheck, CircleDashed, CirclePause, CircleQuestionMark, CircleX, Clock, type LucideIcon } from 'lucide-react';
import type { Program } from '@/lib/schema';
import { statusLabel, type DerivedState } from '@/lib/status';
import { cn } from '@/lib/cn';

/** Re-exported for callers that already import it from here. */
export { statusLabel };

export type StatusState = Program['status']['state'];

export type StatusPillProps = {
  declared: StatusState;
  derived?: DerivedState;
  daysToClose?: number;
  className?: string;
};

type Tone = 'ok' | 'warn' | 'neutral' | 'outline';

const STYLES: Record<DerivedState, { icon: LucideIcon; tone: Tone }> = {
  open: { icon: CircleCheck, tone: 'ok' },
  rolling: { icon: CircleCheck, tone: 'ok' },
  'closing-soon': { icon: Clock, tone: 'warn' },
  upcoming: { icon: CircleDashed, tone: 'outline' },
  unverified: { icon: CircleQuestionMark, tone: 'outline' },
  paused: { icon: CirclePause, tone: 'neutral' },
  closed: { icon: CircleX, tone: 'neutral' },
};

const TONES: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok-fg border-transparent',
  warn: 'bg-warn-bg text-warn-fg border-transparent',
  neutral: 'bg-neutral-bg text-neutral-fg border-transparent',
  outline: 'bg-transparent text-neutral-fg border-border-strong',
};

/** Program status: always an icon plus a text label, never colour alone. */
export function StatusPill({ declared, derived, daysToClose, className }: StatusPillProps) {
  const state = derived ?? declared;
  const { icon: Icon, tone } = STYLES[state];
  return (
    <span
      data-testid="status-pill"
      data-state={state}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5',
        TONES[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" size={16} strokeWidth={1.5} className="shrink-0" />
      <span className={cn(state === 'closing-soon' && 'num', state === 'closed' && 'line-through')}>
        {statusLabel(state, daysToClose)}
      </span>
    </span>
  );
}
