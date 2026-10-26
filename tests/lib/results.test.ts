import { describe, it, expect } from 'vitest';
import type { GateResult } from '@/lib/gates';
import { PROGRAMS } from '@/content/programs';
import { assessAll, estimateFunding } from '@/lib/assess';
import type { Profile } from '@/lib/schema';
import {
  countedPrograms, firstIssue, gateSummaryText, groupsForTrack, summariseGates, GROUP_INFO,
} from '@/lib/assessment/results';

const now = new Date('2026-10-27T00:00:00Z');

const gate = (result: GateResult['result'], severity: GateResult['severity'] = 'hard', extra: Partial<GateResult> = {}): GateResult => ({
  id: 'au-entity', label: 'Australian company (ACN)', severity, result, reason: `reason ${result}`, fixable: result !== 'pass', ...extra,
});

describe('summariseGates', () => {
  it('counts each outcome', () => {
    expect(summariseGates([gate('pass'), gate('pass'), gate('fail'), gate('unknown')])).toEqual({ pass: 2, fail: 1, unknown: 1, total: 4 });
    expect(summariseGates([])).toEqual({ pass: 0, fail: 0, unknown: 0, total: 0 });
  });
});

describe('gateSummaryText', () => {
  it('reads "N of M checks pass", adding unknown and failing counts only when present', () => {
    expect(gateSummaryText({ pass: 4, fail: 1, unknown: 1, total: 6 })).toBe('4 of 6 checks pass · 1 unknown · 1 not met');
    expect(gateSummaryText({ pass: 4, fail: 0, unknown: 2, total: 6 })).toBe('4 of 6 checks pass · 2 unknown');
    expect(gateSummaryText({ pass: 3, fail: 0, unknown: 0, total: 3 })).toBe('All 3 checks pass');
    expect(gateSummaryText({ pass: 1, fail: 0, unknown: 0, total: 1 })).toBe('The 1 check passes');
    expect(gateSummaryText({ pass: 0, fail: 0, unknown: 0, total: 0 })).toBe('No specific checks recorded');
  });
});

describe('firstIssue', () => {
  it('prefers a required check that is not met, then unknown, then a soft failure', () => {
    expect(firstIssue([gate('pass'), gate('unknown', 'hard', { reason: 'u' }), gate('fail', 'hard', { reason: 'f' })])?.reason).toBe('f');
    expect(firstIssue([gate('fail', 'soft', { reason: 's' }), gate('unknown', 'hard', { reason: 'u' })])?.reason).toBe('u');
    expect(firstIssue([gate('pass'), gate('fail', 'soft', { reason: 's' })])?.reason).toBe('s');
    expect(firstIssue([gate('pass'), gate('unknown', 'soft')])).toBeUndefined();
  });
});

describe('groupsForTrack', () => {
  const profile: Profile = { persona: 'bootstrapped', vcBacked: false, hasAcn: true };
  const all = assessAll(PROGRAMS, profile, now);

  it('lists all four groups in order with descriptions, filtered to the track', () => {
    const groups = groupsForTrack(all, 'quick-wins');
    expect(groups.map((g) => g.group)).toEqual(['act-now', 'prepare', 'watch', 'not-a-fit']);
    for (const g of groups) {
      expect(GROUP_INFO[g.group].description.length).toBeGreaterThan(0);
      for (const a of g.items) expect(a.track).toBe('quick-wins');
    }
    const total = groupsForTrack(all, 'funding').concat(groups).reduce((n, g) => n + g.items.length, 0);
    expect(total).toBe(all.length);
  });
});

describe('countedPrograms', () => {
  it('splits counted programs into funding and credits, by name', () => {
    const profile: Profile = { persona: 'bootstrapped', hasAcn: true, experimental: true, rdSpend: '20k-100k', turnover: 'under-1m', foreignSubsidiary: false };
    const all = assessAll(PROGRAMS, profile, now);
    const est = estimateFunding(all, profile);
    const { funding, credits } = countedPrograms(est, PROGRAMS);
    expect(funding).toContain('R&D Tax Incentive');
    expect([...funding, ...credits]).toHaveLength(est.includedSlugs.length);
    for (const name of credits) expect(PROGRAMS.find((p) => p.name === name)!.benefit.kind).toBe('credits');
  });
});
