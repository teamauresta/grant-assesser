import { describe, it, expect } from 'vitest';
import { ProgramSchema, ProfileSchema, WorkspaceSchema } from '@/lib/schema';

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
