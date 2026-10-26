import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'aea',
  name: 'Australia\'s Economic Accelerator (AEA)',
  provider: 'Department of Education',
  level: 'federal',
  type: 'grant',
  benefit: { kind: 'cash', currency: 'AUD',
    note: 'Funded university research commercialisation projects. No new projects will be funded.' },
  status: { state: 'closed', note: 'No new projects beyond 2025–26. Existing grants continue and run to 30 June 2028.' },
  deadlines: [],
  gates: [{ id: 'research-partner', min: 'formal' }],
  scores: { funding: 3, value: 4, effort: 2, speed: 1 },
  goalTemplate: [
    { title: 'Ask university partners whether an existing AEA project could involve you', offsetDays: 30 },
    { title: 'Remove AEA from your funding forecast', offsetDays: 7 },
  ],
  content: {
    summary: 'A university research commercialisation program. It will not fund new projects; existing projects continue to June 2028.',
    howToApply: [
      'There is no way to apply for new funding.',
      'If a university partner already holds an AEA grant, ask whether your company can take part in that project.',
    ],
    prepare: [
      'A list of university partners and their current commercialisation projects',
      'A clear role your company could play in an existing project',
    ],
    mistakes: [
      'Forecasting new AEA funding',
      'Reading running projects as a sign the program is still open',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.education.gov.au/australias-economic-accelerator', title: 'Australia\'s Economic Accelerator (Department of Education)', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
