import { ProgramSchema, type Program, type ProgramInput } from '@/lib/schema';

export function makeProgram(over: Partial<ProgramInput> = {}): Program {
  return ProgramSchema.parse({
    slug: 'test', name: 'Test', provider: 'P', level: 'federal', type: 'grant',
    benefit: { kind: 'cash', currency: 'AUD', note: '', min: 10_000, max: 50_000 },
    status: { state: 'open' }, deadlines: [], gates: [],
    scores: { funding: 3, value: 5, effort: 3, speed: 3 },
    content: { summary: 's', howToApply: [], prepare: [], mistakes: [] },
    verification: { lastVerified: '2026-10-26', sources: [{ url: 'https://example.gov.au', title: 't', official: true }] },
    ...over,
  });
}
