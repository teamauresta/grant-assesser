import { describe, it, expect } from 'vitest';
import { PROGRAMS } from '@/content/programs';
import { evaluateGates } from '@/lib/gates';
import type { Profile } from '@/lib/schema';

const now = new Date('2026-10-27T00:00:00Z');
const answered: Profile = {
  persona: 'pre-raise', hasAcn: true, gstRegistered: true, incorporatedOn: '2025-01-15', foreignSubsidiary: false,
  state: 'vic', fyEndMonth: 6, turnover: 'under-1m', rdSpend: '100k-500k', experimental: true,
  contemporaneousRecords: true, businessModel: 'product', hasMvp: true, hasWebsite: true, stack: ['gcp'],
  fundingStage: 'seed', vcBacked: false, acceleratorMember: false, lastRoundOn: '2026-03-01',
  priorCreditsUsd: { aws: 0, azure: 0, gcp: 0 }, cashMatch: '20k-60k', researchPartner: 'informal',
  industryPartners: 0, sectors: ['other'], customerEvidence: 'pilots', womenLed: 'prefer-not',
};

describe('program content', () => {
  it('slugs are unique', () => { expect(new Set(PROGRAMS.map((p) => p.slug)).size).toBe(PROGRAMS.length); });
  it('open/rolling programs cite an official source', () => {
    for (const p of PROGRAMS.filter((p) => ['open', 'rolling'].includes(p.status.state)))
      expect(p.verification.sources.some((s) => s.official), p.slug).toBe(true);
  });
  it('stacking references existing programs', () => {
    const slugs = new Set(PROGRAMS.map((p) => p.slug));
    for (const p of PROGRAMS) for (const s of p.stacking) expect(slugs.has(s.with), `${p.slug} → ${s.with}`).toBe(true);
  });
  it('benefit min ≤ max', () => {
    for (const p of PROGRAMS) if (p.benefit.min !== undefined && p.benefit.max !== undefined) expect(p.benefit.min, p.slug).toBeLessThanOrEqual(p.benefit.max);
  });
  it('every gate evaluates without throwing and has a clean label', () => {
    for (const p of PROGRAMS) for (const profile of [{}, answered]) {
      const results = evaluateGates(p.gates, profile, { now });
      expect(results, p.slug).toHaveLength(p.gates.length);
      for (const r of results) expect(r.label, `${p.slug} → ${r.id}`).not.toMatch(/undefined|NaN/);
    }
  });
});
