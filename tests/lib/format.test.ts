import { describe, it, expect } from 'vitest';
import { formatBenefit, formatMoney, moneyCounter, LEVEL_LABELS, TYPE_LABELS } from '@/lib/format';
import type { Program } from '@/lib/schema';

type Benefit = Program['benefit'];
const b = (over: Partial<Benefit>): Benefit => ({ kind: 'cash', currency: 'AUD', note: '', ...over });

describe('formatMoney', () => {
  it('abbreviates thousands and millions, trimming trailing zeros', () => {
    expect(formatMoney(20_000, 'AUD')).toBe('$20K');
    expect(formatMoney(1_250_000, 'AUD')).toBe('$1.25M');
    expect(formatMoney(5_000_000, 'AUD')).toBe('$5M');
    expect(formatMoney(2_500, 'AUD')).toBe('$2.5K');
    expect(formatMoney(150_000, 'USD')).toBe('US$150K');
  });
  it('shows small amounts in full', () => {
    expect(formatMoney(500, 'AUD')).toBe('$500');
    expect(formatMoney(0, 'USD')).toBe('US$0');
  });
});

describe('moneyCounter', () => {
  const finals: [number, 'AUD' | 'USD'][] = [
    [43_500, 'AUD'], [8_700, 'AUD'], [30_000, 'AUD'], [1_250_000, 'AUD'], [5_000_000, 'AUD'],
    [150_000, 'USD'], [2_500, 'USD'], [500, 'AUD'], [999, 'AUD'], [999_999, 'AUD'],
  ];
  const samples = (final: number) => Array.from({ length: 201 }, (_, i) => (final * i) / 200).concat([final - 0.001, final * 0.9999]);
  const unit = (s: string) => s.replace(/^(US)?\$[\d.]+/, '');

  it('ends on exactly formatMoney(final)', () => {
    for (const [final, currency] of finals) expect(moneyCounter(final, currency)(final)).toBe(formatMoney(final, currency));
  });

  it('never grows wider than the final text while counting, so the layout never moves', () => {
    for (const [final, currency] of finals) {
      const fmt = moneyCounter(final, currency);
      const max = formatMoney(final, currency).length;
      for (const n of samples(final)) expect(fmt(n).length, `${final} at ${n}: ${fmt(n)}`).toBeLessThanOrEqual(max);
    }
  });

  it('keeps the final value\'s unit and decimals throughout (no "$1.79K" on the way to "$43.5K")', () => {
    for (const [final, currency] of finals) {
      const fmt = moneyCounter(final, currency);
      const end = unit(formatMoney(final, currency));
      for (const n of samples(final)) expect(unit(fmt(n)), `${final} at ${n}: ${fmt(n)}`).toBe(end);
    }
    const fmt = moneyCounter(43_500, 'AUD');
    expect(fmt(0)).toBe('$0.0K');
    expect(fmt(1_790)).toBe('$1.8K');
    expect(fmt(43_020)).toBe('$43.0K');
    expect(moneyCounter(30_000, 'AUD')(12_345)).toBe('$12K');
    expect(moneyCounter(1_250_000, 'AUD')(600_000)).toBe('$0.60M');
    expect(moneyCounter(500, 'AUD')(123.4)).toBe('$123');
  });
});

describe('formatBenefit', () => {
  it('shows a cash range with the symbol on both ends', () => {
    expect(formatBenefit(b({ min: 20_000, max: 60_000 }))).toBe('$20K–$60K');
  });
  it('shows "Up to" when only a maximum is known (or the minimum is zero)', () => {
    expect(formatBenefit(b({ max: 150_000, currency: 'USD' }))).toBe('Up to US$150K');
    expect(formatBenefit(b({ max: 1_250_000 }))).toBe('Up to $1.25M');
    expect(formatBenefit(b({ min: 0, max: 100_000 }))).toBe('Up to $100K');
  });
  it('shows "From" when only a minimum is known', () => {
    expect(formatBenefit(b({ min: 10_000 }))).toBe('From $10K');
  });
  it('shows a single amount when min equals max', () => {
    expect(formatBenefit(b({ min: 1_250_000, max: 1_250_000 }))).toBe('$1.25M');
  });
  it('says "Amount varies" for cash without amounts', () => {
    expect(formatBenefit(b({}))).toBe('Amount varies');
  });
  it('marks consortium awards so they are not read as company cash', () => {
    expect(formatBenefit(b({ max: 1_250_000, consortium: true }))).toBe('Up to $1.25M (consortium)');
    expect(formatBenefit(b({ consortium: true }))).toBe('Amount varies (consortium)');
  });
  it('suffixes credits', () => {
    expect(formatBenefit(b({ kind: 'credits', currency: 'USD', min: 2_000, max: 2_000 }))).toBe('US$2K credits');
    expect(formatBenefit(b({ kind: 'credits', currency: 'USD', min: 0, max: 150_000 }))).toBe('Up to US$150K credits');
    expect(formatBenefit(b({ kind: 'credits', currency: 'USD', min: 5_000, max: 250_000 }))).toBe('US$5K–US$250K credits');
    expect(formatBenefit(b({ kind: 'credits', currency: 'USD' }))).toBe('Credits');
  });
  it('labels equity and debt', () => {
    expect(formatBenefit(b({ kind: 'equity', min: 120_000, max: 120_000 }))).toBe('$120K for equity');
    expect(formatBenefit(b({ kind: 'equity', min: 50_000, max: 300_000 }))).toBe('$50K–$300K for equity');
    expect(formatBenefit(b({ kind: 'equity' }))).toBe('Equity investment');
    expect(formatBenefit(b({ kind: 'debt', min: 50_000, max: 5_000_000 }))).toBe('$50K–$5M venture debt');
    expect(formatBenefit(b({ kind: 'debt' }))).toBe('Venture debt');
  });
  it('labels services, tax offsets and investor incentives', () => {
    expect(formatBenefit(b({ kind: 'service' }))).toBe('Free service');
    expect(formatBenefit(b({ kind: 'service', max: 50_000 }))).toBe('Up to $50K in services');
    expect(formatBenefit(b({ kind: 'tax-offset', estimator: 'rdti' }))).toBe('Tax offset');
    expect(formatBenefit(b({ kind: 'investor' }))).toBe('Investor tax offset');
  });
});

describe('labels', () => {
  it('has a human label for every type and level', () => {
    expect(TYPE_LABELS['tax-incentive']).toBe('Tax incentive');
    expect(TYPE_LABELS['investor-incentive']).toBe('Investor incentive');
    expect(LEVEL_LABELS.vic).toBe('Victoria');
  });
});
