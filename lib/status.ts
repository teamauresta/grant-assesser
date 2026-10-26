import type { Program, Profile } from '@/lib/schema';
import { MELBOURNE, daysBetween, endOfMonthISO, todayISO, zonedToInstant } from '@/lib/dates';

export type DerivedState = Program['status']['state'] | 'closing-soon';
export type ResolvedDeadline = {
  label: string; kind: 'close' | 'milestone'; date: string; time?: string; tz: string; allDay: boolean; at: Date;
};
export type StatusInfo = {
  state: DerivedState; declared: Program['status']['state'];
  nextDeadline?: ResolvedDeadline; daysToClose?: number; stale: boolean; daysSinceVerified: number;
};

export const CLOSING_SOON_DAYS = 14;
export const STALE_DAYS = 60;

function fyRelative(today: string, fyEndMonth: number, monthsAfter: number): string {
  const year = Number(today.slice(0, 4));
  let fyEnd = endOfMonthISO(year, fyEndMonth);
  if (fyEnd > today) fyEnd = endOfMonthISO(year - 1, fyEndMonth);
  const [y, m] = fyEnd.split('-').map(Number);
  let deadline = endOfMonthISO(y, m + monthsAfter);
  if (deadline < today) deadline = endOfMonthISO(y + 1, m + monthsAfter);
  return deadline;
}

export function resolveDeadlines(p: Program, now: Date, profile: Profile = {}): ResolvedDeadline[] {
  const today = todayISO(now);
  return p.deadlines
    .map((d): ResolvedDeadline => {
      if ('relative' in d) {
        const date = fyRelative(today, profile.fyEndMonth ?? 6, 10);
        return { label: d.label, kind: d.kind, date, tz: MELBOURNE, allDay: true, at: zonedToInstant(date, '23:59', MELBOURNE) };
      }
      const tz = d.tz ?? MELBOURNE;
      return { label: d.label, kind: d.kind, date: d.date, time: d.time, tz, allDay: !d.time, at: zonedToInstant(d.date, d.time ?? '23:59', tz) };
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * True when the program has at least one close deadline and none of them is still in the future.
 * Used by the weekly freshness check to flag programs whose declared state needs a human review.
 */
export function hasPastCloseOnly(p: Program, now: Date, profile: Profile = {}): boolean {
  const closes = resolveDeadlines(p, now, profile).filter((d) => d.kind === 'close');
  return closes.length > 0 && closes.every((d) => d.at.getTime() <= now.getTime());
}

export function deriveStatus(p: Program, now: Date, profile: Profile = {}): StatusInfo {
  const declared = p.status.state;
  const deadlines = resolveDeadlines(p, now, profile);
  const future = deadlines.filter((d) => d.at.getTime() > now.getTime());
  const closes = deadlines.filter((d) => d.kind === 'close');
  const futureCloses = closes.filter((d) => d.at.getTime() > now.getTime());
  const today = todayISO(now);
  const daysSinceVerified = daysBetween(p.verification.lastVerified, today);

  let state: DerivedState = declared;
  let daysToClose: number | undefined;
  // Only open/rolling programs auto-close. A past close on an upcoming, paused or unverified program
  // usually means the next round has not been announced yet, so whether it is closed, reopening or
  // replaced needs a human decision; the weekly freshness check flags these via hasPastCloseOnly().
  if ((declared === 'open' || declared === 'rolling') && closes.length) {
    if (!futureCloses.length) state = 'closed';
    else {
      // Count days to the close's Melbourne calendar date, not its local date in a foreign tz.
      daysToClose = daysBetween(today, todayISO(futureCloses[0].at, MELBOURNE));
      if (daysToClose <= CLOSING_SOON_DAYS) state = 'closing-soon';
    }
  }
  return { state, declared, nextDeadline: future[0], daysToClose, stale: daysSinceVerified > STALE_DAYS, daysSinceVerified };
}
