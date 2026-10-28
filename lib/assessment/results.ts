import type { Program } from '@/lib/schema';
import type { GateResult } from '@/lib/gates';
import type { Assessment, FundingEstimate, Track } from '@/lib/assess';
import { GROUP_INFO, GROUP_ORDER, type Group } from '@/lib/groups';

export { GROUP_INFO };

export const TRACK_INFO: Record<Track, { label: string; description: string }> = {
  funding: { label: 'Funding', description: 'Grants, tax offsets and other cash.' },
  'quick-wins': { label: 'Quick wins', description: 'Credits and free services that save cash now.' },
};

export type GateSummary = { pass: number; fail: number; unknown: number; total: number };

export function summariseGates(gates: GateResult[]): GateSummary {
  const count = (r: GateResult['result']) => gates.filter((g) => g.result === r).length;
  return { pass: count('pass'), fail: count('fail'), unknown: count('unknown'), total: gates.length };
}

/** "4 of 6 checks pass · 1 unknown · 1 not met". */
export function gateSummaryText({ pass, fail, unknown, total }: GateSummary): string {
  if (total === 0) return 'No specific checks recorded';
  if (pass === total) return total === 1 ? 'The 1 check passes' : `All ${total} checks pass`;
  return [
    `${pass} of ${total} checks pass`,
    unknown > 0 && `${unknown} unknown`,
    fail > 0 && `${fail} not met`,
  ].filter(Boolean).join(' · ');
}

/**
 * The check most worth acting on: a required check that is not met, else a required one that is
 * unknown, else a "helps" check that is not met. Unknown "helps" checks don't block anything.
 */
export function firstIssue(gates: GateResult[]): GateResult | undefined {
  const hard = gates.filter((g) => g.severity === 'hard');
  return hard.find((g) => g.result === 'fail')
    ?? hard.find((g) => g.result === 'unknown')
    ?? gates.find((g) => g.severity === 'soft' && g.result === 'fail');
}

export type ResultGroup = { group: Group; items: Assessment[] };

/** All four groups, in order, holding the track's assessments (already ranked by assessAll). */
export function groupsForTrack(assessments: Assessment[], track: Track): ResultGroup[] {
  const inTrack = assessments.filter((a) => a.track === track);
  return GROUP_ORDER.map((group) => ({ group, items: inTrack.filter((a) => a.group === group) }));
}

/** Names of the programs behind a funding estimate, split into cash/tax and credits. */
export function countedPrograms(estimate: FundingEstimate, programs: Program[]): { funding: string[]; credits: string[] } {
  const out = { funding: [] as string[], credits: [] as string[] };
  for (const slug of estimate.includedSlugs) {
    const p = programs.find((x) => x.slug === slug);
    if (!p) continue;
    (p.benefit.kind === 'credits' ? out.credits : out.funding).push(p.name);
  }
  return out;
}
