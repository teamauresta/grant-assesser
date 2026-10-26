import type { Persona, Profile, Program } from '@/lib/schema';
import type { GateResult } from '@/lib/gates';
import { normaliseRef } from '@/lib/gates';

export type Dims = { funding: number; probability: number; effort: number; value: number; speed: number };
export type ScoreBreakdown = { dims: Dims; weights: Dims; total: number; notes: string[] };

export const WEIGHTS: Record<Persona, Dims> = {
  bootstrapped: { funding: 1, probability: 1.2, effort: 1.3, value: 1, speed: 1.3 },
  'pre-raise': { funding: 1, probability: 1, effort: 1, value: 1, speed: 1 },
  'vc-backed': { funding: 1.3, probability: 1, effort: 0.8, value: 1.2, speed: 1 },
};

const clamp = (n: number) => Math.max(0, Math.min(5, n));

export function probabilityFrom(gates: GateResult[]): number {
  const softFails = gates.filter((g) => g.severity === 'soft' && g.result === 'fail').length;
  const hardFixable = gates.filter((g) => g.severity === 'hard' && g.result === 'fail' && g.fixable).length;
  const unknowns = gates.filter((g) => g.result === 'unknown').length;
  return clamp(4 - 1.5 * softFails - 1 * hardFixable - 0.5 * unknowns);
}

export function adjustEffort(base: number, hours: Profile['founderHoursPerWeek']): number {
  if (hours === 'under-2' && base < 4) return clamp(base - 1);
  if (hours === 'over-10') return clamp(base + 0.5);
  return base;
}

export function scoreProgram(program: Program, gates: GateResult[], profile: Profile): ScoreBreakdown {
  const persona = profile.persona ?? 'pre-raise';
  const weights = { ...WEIGHTS[persona] };
  const notes: string[] = [];
  if (profile.urgency === 'now') { weights.speed *= 1.3; notes.push('Speed weighted up: funding needed now'); }
  const dims: Dims = {
    funding: program.scores.funding,
    probability: probabilityFrom(gates),
    effort: adjustEffort(program.scores.effort, profile.founderHoursPerWeek),
    value: program.scores.value,
    speed: program.scores.speed,
  };
  const keys = Object.keys(dims) as (keyof Dims)[];
  const sumW = keys.reduce((s, k) => s + weights[k], 0);
  const sumWD = keys.reduce((s, k) => s + weights[k] * dims[k], 0);
  let total = Math.round((sumWD / (sumW * 5)) * 100);
  if (persona === 'bootstrapped' && program.gates.some((r) => normaliseRef(r).id === 'cash-match')) {
    total = Math.max(0, total - 10);
    notes.push('Cash match ties up runway for a bootstrapped company');
  }
  return { dims, weights, total, notes };
}
