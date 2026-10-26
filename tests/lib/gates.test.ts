import { describe, it, expect } from 'vitest';
import { describeGate, evaluateGate } from '@/lib/gates';

const now = new Date('2026-10-27T00:00:00Z');
const ev = (ref: Parameters<typeof evaluateGate>[0], profile = {}) => evaluateGate(ref, profile, { now });

describe('gates', () => {
  it('unanswered is unknown, never pass', () => {
    expect(ev('au-entity').result).toBe('unknown');
    expect(ev({ id: 'incorporated-within', months: 24 }).result).toBe('unknown');
  });
  it('au-entity pass / fixable fail', () => {
    expect(ev('au-entity', { hasAcn: true }).result).toBe('pass');
    const r = ev('au-entity', { hasAcn: false });
    expect(r.result).toBe('fail'); expect(r.fixable).toBe(true); expect(r.severity).toBe('hard');
  });
  it('incorporated-within', () => {
    expect(ev({ id: 'incorporated-within', months: 24 }, { incorporatedOn: '2025-04-27' }).result).toBe('pass');
    const r = ev({ id: 'incorporated-within', months: 24 }, { incorporatedOn: '2024-01-01' });
    expect(r.result).toBe('fail'); expect(r.fixable).toBe(false);
  });
  it('turnover-under uses band edges', () => {
    expect(ev({ id: 'turnover-under', aud: 20_000_000 }, { turnover: '10m-20m' }).result).toBe('pass');
    expect(ev({ id: 'turnover-under', aud: 20_000_000 }, { turnover: '20m-50m' }).result).toBe('fail');
    expect(ev({ id: 'turnover-under', aud: 5_000_000 }, { turnover: '1m-10m' }).result).toBe('unknown');
  });
  it('turnover-or-age passes if either passes', () => {
    const ref = { id: 'turnover-or-age' as const, turnoverUnder: 10_000_000, yearsUnder: 3 };
    expect(ev(ref, { turnover: '10m-20m', incorporatedOn: '2025-01-01' }).result).toBe('pass');
    expect(ev(ref, { turnover: '10m-20m', incorporatedOn: '2020-01-01' }).result).toBe('fail');
    expect(ev(ref, { turnover: '10m-20m' }).result).toBe('unknown');
  });
  it('vc-funded derives from persona; pre-raise is fixable', () => {
    expect(ev('vc-funded', { persona: 'vc-backed' }).result).toBe('pass');
    const boot = ev('vc-funded', { persona: 'bootstrapped' });
    expect(boot.result).toBe('fail'); expect(boot.fixable).toBe(false);
    expect(ev('vc-funded', { persona: 'pre-raise' }).fixable).toBe(true);
    expect(ev('vc-funded', { persona: 'bootstrapped', vcBacked: true }).result).toBe('pass');
  });
  it('cash-match bands', () => {
    const ref = { id: 'cash-match' as const, min: 20_000 };
    expect(ev(ref, { cashMatch: '20k-60k' }).result).toBe('pass');
    expect(ev(ref, { cashMatch: 'under-20k' }).result).toBe('fail');
    expect(ev(ref, { cashMatch: 'under-20k' }).fixable).toBe(true);
    expect(ev({ id: 'cash-match', min: 100_000 }, { cashMatch: '60k-250k' }).result).toBe('unknown');
  });
  it('last-round-within picks the rule for the stage', () => {
    const ref = { id: 'last-round-within' as const, rules: [{ stages: ['pre-seed', 'seed'], months: 60 }, { stages: ['series-a'], months: 12 }] };
    expect(ev(ref, { fundingStage: 'seed', lastRoundOn: '2023-01-01' }).result).toBe('pass');
    expect(ev(ref, { fundingStage: 'series-a', lastRoundOn: '2025-01-01' }).result).toBe('fail');
    expect(ev(ref, { fundingStage: 'series-b', lastRoundOn: '2026-01-01' }).result).toBe('fail');
  });
  it('soft defaults and severity override', () => {
    expect(ev('contemporaneous-records', { contemporaneousRecords: false }).severity).toBe('soft');
    expect(ev({ id: 'au-entity', severity: 'soft' }).severity).toBe('soft');
  });
  it('sector-any and women-led', () => {
    expect(ev({ id: 'sector-any', sectors: ['energy'] }, { sectors: ['energy', 'other'] }).result).toBe('pass');
    expect(ev({ id: 'sector-any', sectors: ['energy'] }, { sectors: ['fintech'] }).result).toBe('fail');
    expect(ev('women-led', { womenLed: 'prefer-not' }).result).toBe('unknown');
  });
  it('every result has a label and reason', () => {
    const r = ev({ id: 'prior-credits-max', provider: 'gcp', usd: 0 }, { priorCreditsUsd: { gcp: 300 } });
    expect(r.result).toBe('fail'); expect(r.label).toMatch(/credits/i); expect(r.reason.length).toBeGreaterThan(0);
  });
});

describe('age gates use calendar-month cut-offs', () => {
  const within24 = { id: 'incorporated-within' as const, months: 24 };
  it('incorporated-within fails a day past N calendar months (no month of slack)', () => {
    const r = ev(within24, { incorporatedOn: '2024-09-28' }); // cut-off is 2024-10-27
    expect(r.result).toBe('fail');
    expect(r.reason).toMatch(/24 months/);
  });
  it('incorporated-within is inclusive at exactly N months', () => {
    expect(ev(within24, { incorporatedOn: '2024-10-27' }).result).toBe('pass');
    expect(ev(within24, { incorporatedOn: '2024-10-26' }).result).toBe('fail');
  });
  it('incorporated-within keeps a human-readable age', () => {
    expect(ev(within24, { incorporatedOn: '2025-04-27' }).reason).toBe('Incorporated 18 months ago');
  });
  it('turnover-or-age "under Y years" is strict at exactly Y years', () => {
    const ref = { id: 'turnover-or-age' as const, turnoverUnder: 10_000_000, yearsUnder: 3 };
    expect(ev(ref, { turnover: '10m-20m', incorporatedOn: '2023-10-27' }).result).toBe('fail');
    expect(ev(ref, { turnover: '10m-20m', incorporatedOn: '2023-10-28' }).result).toBe('pass');
    expect(ev(ref, { turnover: '10m-20m', incorporatedOn: '2023-10-28' }).reason).toBe('Incorporated 35 months ago');
  });
  it('last-round-within fails a day past the stage limit', () => {
    const ref = { id: 'last-round-within' as const, rules: [{ stages: ['pre-seed', 'seed'], months: 60 }] };
    expect(ev(ref, { fundingStage: 'seed', lastRoundOn: '2021-10-07' }).result).toBe('fail');
    expect(ev(ref, { fundingStage: 'seed', lastRoundOn: '2021-10-27' }).result).toBe('pass');
  });
});

describe('last-round-within looks up the stage rule first', () => {
  const ref = { id: 'last-round-within' as const, rules: [{ stages: ['pre-seed', 'seed'], months: 60 }, { stages: ['series-a'], months: 12 }] };
  it('no round raised fails without asking for a round date', () => {
    const r = ev(ref, { fundingStage: 'none' });
    expect(r.result).toBe('fail'); expect(r.reason).toBe('Needs a qualifying funding round'); expect(r.fixable).toBe(false);
  });
  it('a non-qualifying stage fails without a round date', () => {
    const r = ev(ref, { fundingStage: 'series-b' });
    expect(r.result).toBe('fail'); expect(r.reason).toBe('A series-b round does not qualify'); expect(r.fixable).toBe(false);
  });
  it('is fixable only for pre-raise', () => {
    expect(ev(ref, { fundingStage: 'none', persona: 'pre-raise' }).fixable).toBe(true);
    expect(ev(ref, { fundingStage: 'angel', persona: 'pre-raise' }).fixable).toBe(true);
    expect(ev(ref, { fundingStage: 'none', persona: 'bootstrapped' }).fixable).toBe(false);
  });
  it('asks for the round date only when a rule matches', () => {
    const r = ev(ref, { fundingStage: 'seed' });
    expect(r.result).toBe('unknown'); expect(r.reason).toMatch(/round date/i);
    expect(ev(ref, {}).reason).toMatch(/funding stage/i);
  });
});

describe('vc-or-accelerator', () => {
  it('bootstrapped with no accelerator fails (fixable)', () => {
    const r = ev('vc-or-accelerator', { persona: 'bootstrapped', acceleratorMember: false });
    expect(r.result).toBe('fail'); expect(r.fixable).toBe(true);
  });
  it('bootstrapped with accelerator unanswered is unknown', () => {
    expect(ev('vc-or-accelerator', { persona: 'bootstrapped' }).result).toBe('unknown');
  });
  it('passes for vc-backed persona or accelerator member; explicit vcBacked wins', () => {
    expect(ev('vc-or-accelerator', { persona: 'vc-backed' }).result).toBe('pass');
    expect(ev('vc-or-accelerator', { persona: 'bootstrapped', acceleratorMember: true }).result).toBe('pass');
    expect(ev('vc-or-accelerator', { persona: 'bootstrapped', vcBacked: true }).result).toBe('pass');
    expect(ev('vc-or-accelerator', { persona: 'pre-raise', acceleratorMember: false }).result).toBe('fail');
  });
});

describe('turnover-or-age surfaces the single unknown sub-check', () => {
  const ref = { id: 'turnover-or-age' as const, turnoverUnder: 5_000_000, yearsUnder: 3 };
  it('straddling turnover + too old → unknown with the straddle reason and fix', () => {
    const r = ev(ref, { turnover: '1m-10m', incorporatedOn: '2020-01-01' });
    expect(r.result).toBe('unknown');
    expect(r.reason).toBe('Your turnover band straddles $5M');
    expect(r.fix).toBe('Confirm aggregated turnover with your accountant');
  });
  it('turnover fails + age unanswered → asks for the incorporation date', () => {
    const r = ev(ref, { turnover: '10m-20m' });
    expect(r.result).toBe('unknown'); expect(r.reason).toBe('Incorporation date not answered');
  });
  it('both unanswered → asks for both', () => {
    expect(ev(ref, {}).reason).toMatch(/turnover and incorporation date/i);
  });
});

describe('per-ref note', () => {
  const ref = { id: 'turnover-under' as const, aud: 20_000_000, severity: 'soft' as const, note: 'At $20M turnover or more the offset is non-refundable' };
  it('is appended to the reason when the gate fails', () => {
    expect(ev(ref, { turnover: '20m-50m' }).reason).toBe('Turnover is $20M or more. At $20M turnover or more the offset is non-refundable');
  });
  it('is not appended on pass or unknown, and never leaks into the label', () => {
    expect(ev(ref, { turnover: 'under-1m' }).reason).toBe('Turnover is under $20M');
    expect(ev(ref, {}).reason).toBe('Turnover not answered');
    expect(ev(ref, { turnover: '20m-50m' }).label).toBe('Turnover under $20M');
  });
});

describe('describeGate', () => {
  it('gives the label, effective severity and note without a profile', () => {
    expect(describeGate('au-entity')).toEqual({ id: 'au-entity', label: 'Australian company (ACN)', severity: 'hard', note: undefined });
    expect(describeGate({ id: 'cash-match', min: 20_000, severity: 'soft', note: 'Matters for bootstrapped teams' })).toEqual({
      id: 'cash-match', label: ev({ id: 'cash-match', min: 20_000 }).label, severity: 'soft', note: 'Matters for bootstrapped teams',
    });
  });
});
