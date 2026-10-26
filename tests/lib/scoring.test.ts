import { describe, it, expect } from 'vitest';
import { scoreProgram, probabilityFrom, adjustEffort } from '@/lib/scoring';
import { makeProgram } from '../helpers/program';
import type { GateResult } from '@/lib/gates';

const g = (over: Partial<GateResult>): GateResult => ({ id: 'au-entity', label: 'l', severity: 'hard', result: 'pass', reason: 'r', fixable: false, ...over });

describe('scoring', () => {
  const p = makeProgram({ gates: [{ id: 'cash-match', min: 20000 }] }); // funding 3, value 5, effort 3, speed 3
  const allPass = [g({})];
  it('probability from gates', () => {
    expect(probabilityFrom(allPass)).toBe(4);
    expect(probabilityFrom([g({ severity: 'soft', result: 'fail' }), g({ result: 'unknown' })])).toBe(2);
  });
  it('effort adjusts for founder hours', () => {
    expect(adjustEffort(3, 'under-2')).toBe(2);
    expect(adjustEffort(5, 'under-2')).toBe(5);
    expect(adjustEffort(3, 'over-10')).toBe(3.5);
  });
  it('pre-raise uses equal weights', () => {
    expect(scoreProgram(p, allPass, { persona: 'pre-raise' }).total).toBe(72);
  });
  it('bootstrapped weights effort/speed and penalises cash match', () => {
    const s = scoreProgram(p, allPass, { persona: 'bootstrapped' });
    expect(s.total).toBe(61);
    expect(s.notes.join(' ')).toMatch(/cash match/i);
  });
  it('vc-backed weights funding and value', () => {
    expect(scoreProgram(p, allPass, { persona: 'vc-backed' }).total).toBe(73);
  });
});
