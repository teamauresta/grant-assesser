import { describe, it, expect } from 'vitest';
import { PROGRAMS } from '@/content/programs';
import { describeGate, evaluateGates } from '@/lib/gates';
import { EVIDENCE_LEVELS, FUNDING_STAGES, RESEARCH_LEVELS, SECTORS, STACK, type Profile } from '@/lib/schema';

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
  it('registry has 35 programs', () => { expect(PROGRAMS).toHaveLength(35); });
  it('slugs are unique', () => { expect(new Set(PROGRAMS.map((p) => p.slug)).size).toBe(PROGRAMS.length); });
  it('open/rolling programs cite an official source', () => {
    for (const p of PROGRAMS.filter((p) => ['open', 'rolling'].includes(p.status.state)))
      expect(p.verification.sources.some((s) => s.official), p.slug).toBe(true);
  });
  it('stacking references existing programs', () => {
    const slugs = new Set(PROGRAMS.map((p) => p.slug));
    for (const p of PROGRAMS) for (const s of p.stacking) expect(slugs.has(s.with), `${p.slug} → ${s.with}`).toBe(true);
  });
  it('exclusive groups have at least two members of the same benefit kind and currency', () => {
    const groups = Map.groupBy(PROGRAMS.filter((p) => p.exclusiveGroup), (p) => p.exclusiveGroup!);
    expect([...groups.keys()].sort()).toEqual(['aws-activate', 'google-cloud']);
    for (const [g, ps] of groups) {
      expect(ps.length, g).toBeGreaterThanOrEqual(2);
      expect(new Set(ps.map((p) => `${p.benefit.kind}/${p.benefit.currency}`)).size, g).toBe(1);
    }
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

describe('gate wording', () => {
  // 'pre-seed' is the ordinary English spelling, so it is allowed through.
  const hyphenated = [...FUNDING_STAGES, ...SECTORS, ...EVIDENCE_LEVELS, ...RESEARCH_LEVELS].filter((v) => v.includes('-') && v !== 'pre-seed');
  const rawToken = new RegExp(`(${hyphenated.join('|')})|\\b(${STACK.join('|')})\\b|\\b(VIC|NSW|QLD|WA|SA|TAS|ACT|NT)\\b`);
  it('no label or reason shows a raw enum token, lowercase stack id or state code', () => {
    expect(rawToken.test('Raised less than series-a')).toBe(true);
    expect(rawToken.test('Uses gemini')).toBe(true);
    expect(rawToken.test('Based in VIC')).toBe(true);
    for (const p of PROGRAMS) {
      for (const ref of p.gates) expect(describeGate(ref).label, p.slug).not.toMatch(rawToken);
      for (const profile of [{}, answered, { ...answered, fundingStage: 'series-c-plus' as const, state: 'nsw' as const, stack: [] }]) {
        for (const r of evaluateGates(p.gates, profile, { now })) {
          expect(r.label, `${p.slug} → ${r.id}`).not.toMatch(rawToken);
          expect(r.reason, `${p.slug} → ${r.id}`).not.toMatch(rawToken);
        }
      }
    }
  });
});

describe('rdti turnover note', () => {
  it('explains the non-refundable offset when turnover is $20M or more', () => {
    const rdti = PROGRAMS.find((p) => p.slug === 'rdti')!;
    const r = evaluateGates(rdti.gates, { turnover: '20m-50m' }, { now }).find((g) => g.id === 'turnover-under')!;
    expect(r.result).toBe('fail'); expect(r.severity).toBe('soft');
    expect(r.reason).toMatch(/non-refundable/);
  });
});

describe('accuracy review (27 Oct 2026)', () => {
  const get = (slug: string) => PROGRAMS.find((p) => p.slug === slug)!;
  it('Alice Anderson Fund is not shown as accepting applications', () => {
    expect(['open', 'rolling']).not.toContain(get('alice-anderson-fund').status.state);
  });
  it('ESIC requires an Australian company', () => {
    const r = evaluateGates(get('esic').gates, { hasAcn: false }, { now }).find((g) => g.id === 'au-entity')!;
    expect(r.result).toBe('fail');
  });
  it('Google Cloud AI tier excludes consultancies', () => {
    const r = evaluateGates(get('google-cloud-ai').gates, { businessModel: 'services' }, { now }).find((g) => g.id === 'product-company')!;
    expect(r.result).toBe('fail');
  });
  it('WorkSafe trials require GST registration', () => {
    expect(get('worksafe-rtw-trials').gates.some((g) => (typeof g === 'string' ? g : g.id) === 'gst-registered')).toBe(true);
  });
});
