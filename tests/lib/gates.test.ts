import { describe, it, expect } from 'vitest';
import { evaluateGate } from '@/lib/gates';

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
