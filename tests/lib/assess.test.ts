import { describe, it, expect } from 'vitest';
import { groupFor, trackFor, assessProgram, estimateFunding } from '@/lib/assess';
import { makeProgram } from '../helpers/program';
import type { GateResult } from '@/lib/gates';

const g = (over: Partial<GateResult>): GateResult => ({ id: 'au-entity', label: 'l', severity: 'hard', result: 'pass', reason: 'r', fixable: false, ...over });
const now = new Date('2026-10-27T00:00:00Z');

describe('groupFor', () => {
  it('closed programs are excluded from results', () => { expect(groupFor('closed', [])).toBeNull(); });
  it('unfixable hard fail → not-a-fit, even when paused', () => {
    expect(groupFor('paused', [g({ result: 'fail' })])).toBe('not-a-fit');
  });
  it('paused/upcoming/unverified → watch', () => {
    expect(groupFor('upcoming', [g({})])).toBe('watch');
    expect(groupFor('unverified', [g({ result: 'unknown' })])).toBe('watch');
  });
  it('open + all hard pass → act-now; unknown or soft fail → prepare', () => {
    expect(groupFor('rolling', [g({})])).toBe('act-now');
    expect(groupFor('closing-soon', [g({ result: 'unknown' })])).toBe('prepare');
    expect(groupFor('open', [g({ result: 'fail', fixable: true })])).toBe('prepare');
    expect(groupFor('open', [g({}), g({ severity: 'soft', result: 'fail' })])).toBe('prepare');
  });
});

describe('trackFor', () => {
  it('credits and services are quick wins', () => {
    expect(trackFor(makeProgram({ benefit: { kind: 'credits', currency: 'USD', note: '' } }))).toBe('quick-wins');
    expect(trackFor(makeProgram())).toBe('funding');
  });
});

describe('estimateFunding', () => {
  it('counts only cash/tax where hard gates pass; credits separate; consortium excluded', () => {
    const cash = assessProgram(makeProgram({ slug: 'a', gates: ['au-entity'] }), { hasAcn: true }, now);
    const blocked = assessProgram(makeProgram({ slug: 'b', gates: ['au-entity'] }), {}, now);
    const credits = assessProgram(makeProgram({ slug: 'c', benefit: { kind: 'credits', currency: 'USD', note: '', min: 1000, max: 5000 } }), {}, now);
    const crcp = assessProgram(makeProgram({ slug: 'd', benefit: { kind: 'cash', currency: 'AUD', note: '', min: 100000, max: 3000000, consortium: true } }), {}, now);
    const e = estimateFunding([cash, blocked, credits, crcp], {});
    expect(e.aud).toEqual({ low: 10_000, high: 50_000 });
    expect(e.creditsUsd).toEqual({ low: 1000, high: 5000 });
    expect(e.includedSlugs).toEqual(['a', 'c']);
  });
  it('RDTI estimator uses R&D spend band and refundability', () => {
    const rdti = assessProgram(makeProgram({ slug: 'rdti', status: { state: 'rolling' },
      benefit: { kind: 'tax-offset', currency: 'AUD', note: '', estimator: 'rdti' } }), {}, now);
    expect(estimateFunding([rdti], { rdSpend: '20k-100k', turnover: 'under-1m' }).aud).toEqual({ low: 8700, high: 43500 });
  });
  const rdtiProgram = makeProgram({ slug: 'rdti', status: { state: 'rolling' },
    benefit: { kind: 'tax-offset', currency: 'AUD', note: '', estimator: 'rdti' } });
  it('RDTI without R&D spend is not counted as included', () => {
    const e = estimateFunding([assessProgram(rdtiProgram, {}, now)], {});
    expect(e.aud).toEqual({ low: 0, high: 0 });
    expect(e.includedSlugs).toEqual([]);
  });
  it('RDTI non-refundable rate: 33.5% for 20m-50m, 38.5% for over-50m', () => {
    const rdti = assessProgram(rdtiProgram, {}, now);
    expect(estimateFunding([rdti], { rdSpend: '20k-100k', turnover: '20m-50m' }).aud).toEqual({ low: 6700, high: 33500 });
    expect(estimateFunding([rdti], { rdSpend: '20k-100k', turnover: 'over-50m' }).aud).toEqual({ low: 7700, high: 38500 });
  });
  it('only AUD cash goes into aud and only USD credits into creditsUsd', () => {
    const usdCash = assessProgram(makeProgram({ slug: 'usd-cash', benefit: { kind: 'cash', currency: 'USD', note: '', min: 100_000, max: 100_000 } }), {}, now);
    const audCredits = assessProgram(makeProgram({ slug: 'aud-credits', benefit: { kind: 'credits', currency: 'AUD', note: '', min: 1000, max: 2000 } }), {}, now);
    const e = estimateFunding([usdCash, audCredits], {});
    expect(e.aud).toEqual({ low: 0, high: 0 });
    expect(e.creditsUsd).toEqual({ low: 0, high: 0 });
    expect(e.includedSlugs).toEqual([]);
  });
  describe('exclusive groups', () => {
    const credit = (slug: string, min: number | undefined, max: number, exclusiveGroup?: string) =>
      assessProgram(makeProgram({ slug, exclusiveGroup, benefit: { kind: 'credits', currency: 'USD', note: '', min, max } }), {}, now);
    it('counts only the eligible program with the highest max in a group', () => {
      const founders = credit('aws-founders', 1_000, 5_000, 'aws');
      const portfolio = credit('aws-portfolio', undefined, 200_000, 'aws');
      const other = credit('other', 1_000, 10_000);
      const e = estimateFunding([founders, portfolio, other], {});
      expect(e.creditsUsd).toEqual({ low: 1_000, high: 210_000 });
      expect(e.includedSlugs).toEqual(['aws-portfolio', 'other']);
    });
    it('ties on max go to the higher min', () => {
      const a = credit('a', 1_000, 5_000, 'g');
      const b = credit('b', 2_000, 5_000, 'g');
      const e = estimateFunding([a, b], {});
      expect(e.creditsUsd).toEqual({ low: 2_000, high: 5_000 });
      expect(e.includedSlugs).toEqual(['b']);
    });
    it('an ineligible program does not displace an eligible alternative', () => {
      const small = credit('small', 1_000, 5_000, 'aws');
      const big = assessProgram(makeProgram({ slug: 'big', exclusiveGroup: 'aws', gates: ['au-entity'],
        benefit: { kind: 'credits', currency: 'USD', note: '', max: 200_000 } }), {}, now);
      const e = estimateFunding([small, big], {});
      expect(e.creditsUsd).toEqual({ low: 1_000, high: 5_000 });
      expect(e.includedSlugs).toEqual(['small']);
    });
  });
});
