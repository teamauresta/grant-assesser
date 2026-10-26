import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'national-industry-phd',
  name: 'National Industry PhD Program',
  provider: 'National Industry PhD Program',
  level: 'federal',
  type: 'grant',
  benefit: { kind: 'cash', currency: 'AUD',
    note: 'Funds an industry-linked PhD project run with a university partner. Amounts and your contribution are set in the round guidelines.' },
  status: { state: 'closed', note: 'Round 8 closed 21 August 2026. No next round listed.' },
  deadlines: [],
  gates: [
    'au-entity',
    { id: 'research-partner', min: 'active' },
  ],
  scores: { funding: 2, value: 3, effort: 2, speed: 1 },
  goalTemplate: [
    { title: 'Join the program mailing list for the next round', offsetDays: 7 },
    { title: 'Discuss a PhD project with your university partner', offsetDays: 60 },
  ],
  content: {
    summary: 'Support for a PhD candidate to work on a research project with your company and a university. No round is open.',
    howToApply: [
      'Watch the program\'s important dates page for the next round.',
      'Agree a project, candidate and supervisor with a university partner.',
      'Apply together before the round closes.',
    ],
    prepare: [
      'A research question that could sustain a multi-year PhD',
      'A university partner and supervisor',
      'An idea of the funding and supervision your company can commit',
    ],
    mistakes: [
      'Starting without a committed university partner',
      'Underestimating how long the project runs',
    ],
    caveats: [
      'Funding amounts and industry contribution were not verified for this record. Read the next round\'s guidelines.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.niphd.com.au/important-dates', title: 'National Industry PhD Program: important dates', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
