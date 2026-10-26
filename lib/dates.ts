export const MELBOURNE = 'Australia/Melbourne';
const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' → Date at 00:00 UTC. Use only for calendar-date arithmetic. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return toISODate(new Date(parseISODate(iso).getTime() + n * DAY_MS));
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseISODate(toIso).getTime() - parseISODate(fromIso).getTime()) / DAY_MS);
}

/** Walks back n weekdays. Public holidays are not considered. */
export function subtractBusinessDays(iso: string, n: number): string {
  let d = parseISODate(iso);
  let left = n;
  while (left > 0) {
    d = new Date(d.getTime() - DAY_MS);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return toISODate(d);
}

/** month is 1–12 and may overflow, e.g. (2026, 16) → '2027-04-30'. */
export function endOfMonthISO(year: number, month: number): string {
  return toISODate(new Date(Date.UTC(year, month, 0)));
}

/** Calendar-month arithmetic; the day is clamped to the target month's end. n may be negative. */
export function addMonthsISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return toISODate(new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d, lastDay))));
}

/** Whole months elapsed (for display; use addMonthsISO for eligibility cut-offs). */
export function monthsBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
}

/** Calendar date of an instant in tz, as 'YYYY-MM-DD'. */
export function todayISO(now: Date, tz: string = MELBOURNE): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: 'year' | 'month' | 'day') => parts.find((p) => p.type === t)!.value;
  return `${get('year').padStart(4, '0')}-${get('month')}-${get('day')}`;
}

function tzOffsetMs(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - at.getTime();
}

/** Wall-clock date and time in tz → instant. */
export function zonedToInstant(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offset = tzOffsetMs(new Date(guess), tz);
  let instant = guess - offset;
  const offset2 = tzOffsetMs(new Date(instant), tz);
  if (offset2 !== offset) instant = guess - offset2;
  return new Date(instant);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parseISODate(iso));
}
