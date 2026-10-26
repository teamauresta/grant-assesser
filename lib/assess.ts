import type { Profile, Program } from '@/lib/schema';
import { evaluateGates, type GateResult } from '@/lib/gates';
import { deriveStatus, type DerivedState, type StatusInfo } from '@/lib/status';
import { scoreProgram, type ScoreBreakdown } from '@/lib/scoring';

export type Group = 'act-now' | 'prepare' | 'watch' | 'not-a-fit';
export type Track = 'funding' | 'quick-wins';
export type Assessment = { program: Program; status: StatusInfo; gates: GateResult[]; group: Group | null; track: Track; score: ScoreBreakdown };

export const GROUP_ORDER: Group[] = ['act-now', 'prepare', 'watch', 'not-a-fit'];

export function groupFor(state: DerivedState, gates: GateResult[]): Group | null {
  if (state === 'closed') return null;
  const hard = gates.filter((g) => g.severity === 'hard');
  if (hard.some((g) => g.result === 'fail' && !g.fixable)) return 'not-a-fit';
  if (state === 'upcoming' || state === 'paused' || state === 'unverified') return 'watch';
  const blocked = hard.some((g) => g.result !== 'pass') || gates.some((g) => g.severity === 'soft' && g.result === 'fail');
  return blocked ? 'prepare' : 'act-now';
}

export const trackFor = (p: Program): Track => (p.benefit.kind === 'credits' || p.benefit.kind === 'service' ? 'quick-wins' : 'funding');

export function assessProgram(program: Program, profile: Profile, now: Date): Assessment {
  const gates = evaluateGates(program.gates, profile, { now });
  const status = deriveStatus(program, now, profile);
  return { program, status, gates, group: groupFor(status.state, gates), track: trackFor(program), score: scoreProgram(program, gates, profile) };
}

export function assessAll(programs: Program[], profile: Profile, now: Date): Assessment[] {
  return programs
    .map((p) => assessProgram(p, profile, now))
    .filter((a) => a.group !== null)
    .sort((a, b) => GROUP_ORDER.indexOf(a.group!) - GROUP_ORDER.indexOf(b.group!) || b.score.total - a.score.total);
}

const RD_BANDS: Record<NonNullable<Profile['rdSpend']>, [number, number]> = {
  'under-20k': [0, 0], '20k-100k': [20_000, 100_000], '100k-500k': [100_000, 500_000], 'over-500k': [500_000, 1_000_000],
};

function rdtiRange(a: Assessment, profile: Profile): [number, number] {
  if (!profile.rdSpend) return [0, 0];
  const refundable = profile.turnover ? ['under-1m', '1m-10m', '10m-20m'].includes(profile.turnover) : true;
  const rate = refundable ? 0.435 : 0.335; // 25% + 18.5 pts, or 25% + 8.5 pts (non-refundable, ≤2% intensity)
  const [lo, hi] = RD_BANDS[profile.rdSpend];
  return [Math.round(lo * rate), Math.round(hi * rate)];
}

export type FundingEstimate = { aud: { low: number; high: number }; creditsUsd: { low: number; high: number }; includedSlugs: string[] };

export function estimateFunding(assessments: Assessment[], profile: Profile): FundingEstimate {
  const out: FundingEstimate = { aud: { low: 0, high: 0 }, creditsUsd: { low: 0, high: 0 }, includedSlugs: [] };
  for (const a of assessments) {
    if (a.group !== 'act-now' && a.group !== 'prepare') continue;
    if (a.gates.some((g) => g.severity === 'hard' && g.result !== 'pass')) continue;
    const b = a.program.benefit;
    if (b.consortium) continue;
    if (b.kind === 'cash' || b.kind === 'tax-offset') {
      const [lo, hi] = b.estimator === 'rdti' ? rdtiRange(a, profile) : [b.min ?? 0, b.max ?? b.min ?? 0];
      out.aud.low += lo; out.aud.high += hi; out.includedSlugs.push(a.program.slug);
    } else if (b.kind === 'credits') {
      out.creditsUsd.low += b.min ?? 0; out.creditsUsd.high += b.max ?? b.min ?? 0; out.includedSlugs.push(a.program.slug);
    }
  }
  return out;
}
