import type { Program } from '@/lib/schema';
import { MELBOURNE, daysBetween, todayISO } from '@/lib/dates';
import { deriveStatus, resolveDeadlines, type DerivedState, type ResolvedDeadline, type StatusInfo } from '@/lib/status';

export type StatusFilter = 'open-upcoming' | 'all' | DerivedState;
export type ProgramFilters = {
  q?: string;
  status?: StatusFilter;
  type?: Program['type'][];
  level?: Program['level'][];
};

export const PROGRAM_TYPES = [
  'grant', 'voucher', 'tax-incentive', 'credits', 'accelerator', 'capital', 'service', 'investor-incentive',
] as const satisfies readonly Program['type'][];
export const PROGRAM_LEVELS = ['federal', 'vic', 'industry', 'university'] as const satisfies readonly Program['level'][];
export const STATUS_FILTERS = [
  'open-upcoming', 'closing-soon', 'open', 'rolling', 'upcoming', 'unverified', 'paused', 'closed', 'all',
] as const satisfies readonly StatusFilter[];

export const DEFAULT_FILTERS: Required<ProgramFilters> = { q: '', status: 'open-upcoming', type: [], level: [] };

const OPEN_UPCOMING = new Set<DerivedState>(['open', 'rolling', 'closing-soon', 'upcoming', 'unverified']);

/** Sort bucket: closing soon, then open or rolling, then everything else. */
function bucket(state: DerivedState): number {
  if (state === 'closing-soon') return 0;
  if (state === 'open' || state === 'rolling') return 1;
  return 2;
}

/**
 * Filters and sorts the directory. A program missing from `statuses` (e.g. before the client knows
 * "now") is treated as its declared state.
 */
export function filterPrograms(programs: Program[], statuses: Map<string, StatusInfo>, f: ProgramFilters): Program[] {
  const q = f.q?.trim().toLowerCase() ?? '';
  const status = f.status ?? 'open-upcoming';
  const types = f.type?.length ? new Set(f.type) : null;
  const levels = f.level?.length ? new Set(f.level) : null;
  const info = (p: Program) => statuses.get(p.slug) ?? { state: p.status.state as DerivedState, daysToClose: undefined };

  return programs
    .filter((p) => {
      const state = info(p).state;
      if (status === 'open-upcoming' ? !OPEN_UPCOMING.has(state) : status !== 'all' && state !== status) return false;
      if (types && !types.has(p.type)) return false;
      if (levels && !levels.has(p.level)) return false;
      if (q && !`${p.name}\n${p.provider}\n${p.content.summary}`.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      const sa = info(a);
      const sb = info(b);
      return bucket(sa.state) - bucket(sb.state)
        || (sa.state === 'closing-soon' && sb.state === 'closing-soon' ? (sa.daysToClose ?? 0) - (sb.daysToClose ?? 0) : 0)
        || a.name.localeCompare(b.name, 'en-AU');
    });
}

export type ClosingSoonItem = { program: Program; deadline: ResolvedDeadline; daysLeft: number; status: StatusInfo };

const ACCEPTING = new Set<DerivedState>(['open', 'rolling', 'closing-soon']);

/**
 * Programs taking applications (derived state open, rolling or closing soon) whose next close is
 * within `withinDays` Melbourne calendar days, soonest first. Upcoming, unverified, paused and closed
 * programs are left out even with a near close date, so the strip never contradicts their status.
 */
export function closingSoon(programs: Program[], now: Date, withinDays = 30): ClosingSoonItem[] {
  const today = todayISO(now);
  const out: ClosingSoonItem[] = [];
  for (const program of programs) {
    const status = deriveStatus(program, now);
    if (!ACCEPTING.has(status.state)) continue;
    const deadline = resolveDeadlines(program, now).find((d) => d.kind === 'close' && d.at.getTime() > now.getTime());
    if (!deadline) continue;
    const daysLeft = daysBetween(today, todayISO(deadline.at, MELBOURNE));
    if (daysLeft <= withinDays) out.push({ program, deadline, daysLeft, status });
  }
  return out.sort((a, b) => a.deadline.at.getTime() - b.deadline.at.getTime());
}

// ---- URL query <-> filters -------------------------------------------------------------------

const pick = <T extends string>(allowed: readonly T[], raw: string | null): T[] =>
  (raw ?? '').split(',').filter((v): v is T => (allowed as readonly string[]).includes(v));

/** Reads `?q=&status=&type=a,b&level=a,b`, ignoring values it does not recognise. */
export function parseFilters(params: Pick<URLSearchParams, 'get'>): Required<ProgramFilters> {
  const status = params.get('status');
  return {
    q: params.get('q') ?? '',
    status: (STATUS_FILTERS as readonly string[]).includes(status ?? '') ? (status as StatusFilter) : DEFAULT_FILTERS.status,
    type: pick(PROGRAM_TYPES, params.get('type')),
    level: pick(PROGRAM_LEVELS, params.get('level')),
  };
}

/** The query string (without "?") for a set of filters; defaults are left out so URLs stay short. */
export function serializeFilters(f: ProgramFilters): string {
  const params = new URLSearchParams();
  if (f.q?.trim()) params.set('q', f.q.trim());
  if (f.status && f.status !== DEFAULT_FILTERS.status) params.set('status', f.status);
  if (f.type?.length) params.set('type', f.type.join(','));
  if (f.level?.length) params.set('level', f.level.join(','));
  return params.toString();
}
