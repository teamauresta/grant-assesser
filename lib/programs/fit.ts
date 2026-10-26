import type { Profile, Program } from '@/lib/schema';
import { evaluateGates } from '@/lib/gates';
import { blockingGate } from '@/lib/assess';

/** The first clause of a gate reason, for a one-line summary ("Needs institutional VC funding"). */
export function shortReason(reason: string): string {
  return reason.split(/; |\. /)[0].replace(/\.$/, '');
}

/**
 * Programs ruled out by an unfixable required check, keyed by slug, with a one-line reason. Used to
 * de-emphasise (never hide) cards once the user has chosen a persona; empty without one.
 */
export function notAFitReasons(programs: Program[], profile: Profile | undefined, now: Date): Map<string, string> {
  const out = new Map<string, string>();
  if (!profile?.persona) return out;
  for (const p of programs) {
    const gate = blockingGate(evaluateGates(p.gates, profile, { now }));
    if (gate) out.set(p.slug, shortReason(gate.reason));
  }
  return out;
}
