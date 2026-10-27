import type { Program } from '@/lib/schema';
import { deriveStatus, type DerivedState } from '@/lib/status';
import { closingSoon } from './filter';

/** The hero's "Closing in 30 days" window; matches the home Closing soon strip. */
export const STATS_CLOSING_DAYS = 30;

export type ProgramStats = { total: number; openNow: number; closingSoon: number };

const OPEN_NOW = new Set<DerivedState>(['open', 'rolling', 'closing-soon']);

/** The hero's numbers. Depends on `now`, so render it on the client only. */
export function programStats(programs: Program[], now: Date): ProgramStats {
  return {
    total: programs.length,
    openNow: programs.filter((p) => OPEN_NOW.has(deriveStatus(p, now).state)).length,
    closingSoon: closingSoon(programs, now, STATS_CLOSING_DAYS).length,
  };
}

/** The newest verification date across programs (YYYY-MM-DD), or '' for none. */
export function latestVerified(programs: Program[]): string {
  return programs.reduce((max, p) => (p.verification.lastVerified > max ? p.verification.lastVerified : max), '');
}
