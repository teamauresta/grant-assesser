import { describe, it, expect } from 'vitest';
import { GATE_IDS, GATE_PARAMS, GateRefSchema, ProgramSchema, ProfileSchema, WorkspaceSchema } from '@/lib/schema';

const minimal = {
  slug: 'x', name: 'X', provider: 'P', level: 'federal', type: 'grant',
  benefit: { kind: 'cash', currency: 'AUD', note: '' },
  status: { state: 'rolling' }, deadlines: [], gates: ['au-entity'],
  scores: { funding: 1, value: 1, effort: 1, speed: 1 },
  content: { summary: 's', howToApply: [], prepare: [], mistakes: [] },
  verification: { lastVerified: '2026-10-26', sources: [{ url: 'https://example.gov.au', title: 't', official: true }] },
};

describe('schemas', () => {
  it('accepts a minimal program and fills defaults', () => {
    const p = ProgramSchema.parse(minimal);
    expect(p.personas).toEqual({});
    expect(p.goalTemplate).toEqual([]);
    expect(p.changelog).toEqual([]);
  });
  it('rejects bad dates and scores out of range', () => {
    expect(() => ProgramSchema.parse({ ...minimal, verification: { ...minimal.verification, lastVerified: '26/10/2026' } })).toThrow();
    expect(() => ProgramSchema.parse({ ...minimal, scores: { ...minimal.scores, funding: 7 } })).toThrow();
  });
  it('accepts parameterised gate refs', () => {
    expect(() => ProgramSchema.parse({ ...minimal, gates: [{ id: 'incorporated-within', months: 24 }] })).not.toThrow();
    expect(() => ProgramSchema.parse({ ...minimal, gates: ['not-a-gate'] })).toThrow();
  });
  it('profile allows everything to be missing', () => {
    expect(ProfileSchema.parse({})).toEqual({});
  });
  it('workspace requires schemaVersion 1', () => {
    expect(() => WorkspaceSchema.parse({ schemaVersion: 2 })).toThrow();
  });
});

describe('gate params are validated', () => {
  const ok = (gates: unknown[]) => ProgramSchema.safeParse({ ...minimal, gates }).success;
  it('every gate id has a params schema', () => {
    expect(Object.keys(GATE_PARAMS).sort()).toEqual([...GATE_IDS].sort());
  });
  it('rejects a bare ref for a gate that needs params', () => {
    expect(ok(['incorporated-within'])).toBe(false);
    expect(ok([{ id: 'research-partner' }])).toBe(false);
    expect(ok(['au-entity', { id: 'au-entity', severity: 'soft' }])).toBe(true);
  });
  it('rejects bad enum values', () => {
    expect(ok([{ id: 'funding-stage-before', stage: 'series_a' }])).toBe(false);
    expect(ok([{ id: 'funding-stage-before', stage: 'series-a' }])).toBe(true);
    expect(ok([{ id: 'last-round-within', rules: [{ stages: ['seed'], months: 60 }] }])).toBe(true);
    expect(ok([{ id: 'last-round-within', rules: [{ stages: [], months: 60 }] }])).toBe(false);
    expect(ok([{ id: 'last-round-within', rules: [] }])).toBe(false);
    expect(ok([{ id: 'prior-credits-max', provider: 'oracle', usd: 0 }])).toBe(false);
    expect(ok([{ id: 'sector-any', sectors: [] }])).toBe(false);
  });
  it('rejects unknown keys (typos)', () => {
    expect(ok([{ id: 'cash-match', min: 20000, mn: 1 }])).toBe(false);
    expect(ok([{ id: 'incorporated-within', month: 24 }])).toBe(false);
    expect(ok([{ id: 'au-entity', months: 24 }])).toBe(false);
  });
  it('allows severity and note on any ref', () => {
    expect(ok([{ id: 'cash-match', min: 20000, severity: 'soft', note: 'Matched in kind too' }])).toBe(true);
    expect(ok([{ id: 'au-entity', note: 'x' }])).toBe(true);
    expect(ok([{ id: 'au-entity', note: 3 }])).toBe(false);
    expect(GateRefSchema.safeParse({ id: 'cash-match', min: -1 }).success).toBe(false);
  });
});

describe('format validation', () => {
  const withVerification = (v: object) => ({ ...minimal, verification: { ...minimal.verification, ...v } });
  it('isoDate must be a real calendar date', () => {
    expect(ProgramSchema.safeParse(withVerification({ lastVerified: '2026-02-31' })).success).toBe(false);
    expect(ProgramSchema.safeParse(withVerification({ lastVerified: '2026-13-01' })).success).toBe(false);
    expect(ProgramSchema.safeParse(withVerification({ lastVerified: '2024-02-29' })).success).toBe(true);
    expect(ProfileSchema.safeParse({ incorporatedOn: '2025-02-29' }).success).toBe(false);
  });
  it('deadline time must be 00:00–23:59', () => {
    const at = (time: string) => ProgramSchema.safeParse({ ...minimal, deadlines: [{ label: 'c', kind: 'close', date: '2026-11-01', time }] }).success;
    expect(at('00:00')).toBe(true);
    expect(at('23:59')).toBe(true);
    expect(at('24:00')).toBe(false);
    expect(at('12:60')).toBe(false);
    expect(at('9:00')).toBe(false);
  });
  it('source urls must be http or https', () => {
    const src = (url: string) => ProgramSchema.safeParse(withVerification({ sources: [{ url, title: 't', official: true }] })).success;
    expect(src('javascript:alert(1)')).toBe(false);
    expect(src('ftp://example.gov.au/x')).toBe(false);
    expect(src('http://example.gov.au')).toBe(true);
    expect(src('https://example.gov.au/a?b=c')).toBe(true);
  });
});
