import type { Profile, Program } from '@/lib/schema';
import { evaluateGates, type GateResult } from '@/lib/gates';
import { deriveStatus, type DerivedState, type StatusInfo } from '@/lib/status';
import { scoreProgram, type ScoreBreakdown } from '@/lib/scoring';

export type Group = 'act-now' | 'prepare' | 'watch' | 'not-a-fit';
export type Track = 'funding' | 'quick-wins';
export type Assessment = { program: Program; status: StatusInfo; gates: GateResult[]; group: Group | null; track: Track; score: ScoreBreakdown };

export const GROUP_ORDER: Group[] = ['act-now', 'prepare', 'watch', 'not-a-fit'];

/** The first required check that fails and cannot be fixed: why a program is not a fit. */
export const blockingGate = (gates: GateResult[]): GateResult | undefined =>
  gates.find((g) => g.severity === 'hard' && g.result === 'fail' && !g.fixable);

export function groupFor(state: DerivedState, gates: GateResult[]): Group | null {
  if (state === 'closed') return null;
  const hard = gates.filter((g) => g.severity === 'hard');
  if (blockingGate(gates)) return 'not-a-fit';
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

/** Offset rate = company tax rate + premium. Unknown turnover is treated as under $20M (refundable). */
const RDTI_RATE: Record<NonNullable<Profile['turnover']>, number> = {
  'under-1m': 0.435, '1m-10m': 0.435, '10m-20m': 0.435, // refundable: 25% base rate + 18.5 pts
  '20m-50m': 0.335, // non-refundable: 25% base rate + 8.5 pts (intensity ≤ 2%)
  'over-50m': 0.385, // non-refundable: 30% company tax + 8.5 pts (intensity ≤ 2%)
};

function rdtiRange(rdSpend: NonNullable<Profile['rdSpend']>, profile: Profile): [number, number] {
  const rate = RDTI_RATE[profile.turnover ?? 'under-1m'];
  const [lo, hi] = RD_BANDS[rdSpend];
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
    if ((b.kind === 'cash' || b.kind === 'tax-offset') && b.currency === 'AUD') {
      let lo: number, hi: number;
      if (b.estimator === 'rdti') {
        if (!profile.rdSpend) continue; // nothing to estimate from yet
        [lo, hi] = rdtiRange(profile.rdSpend, profile);
      } else [lo, hi] = [b.min ?? 0, b.max ?? b.min ?? 0];
      out.aud.low += lo; out.aud.high += hi; out.includedSlugs.push(a.program.slug);
    } else if (b.kind === 'credits' && b.currency === 'USD') {
      out.creditsUsd.low += b.min ?? 0; out.creditsUsd.high += b.max ?? b.min ?? 0; out.includedSlugs.push(a.program.slug);
    }
  }
  return out;
}
