import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'arena-advancing-renewables',
  name: 'ARENA Advancing Renewables Program',
  provider: 'Australian Renewable Energy Agency (ARENA)',
  level: 'federal',
  type: 'grant',
  benefit: { kind: 'cash', currency: 'AUD',
    note: 'Funding for development, demonstration and pre-commercial deployment projects. Amounts are set per project.' },
  status: { state: 'rolling', note: 'Continuously open until funds are exhausted.' },
  deadlines: [],
  gates: [
    'au-entity',
    { id: 'sector-any', sectors: ['energy'] },
  ],
  scores: { funding: 4, value: 4, effort: 1, speed: 1 },
  goalTemplate: [
    { title: 'Read the program guidelines and ARENA\'s Investment Plan', offsetDays: 7 },
    { title: 'Tell ARENA about your project and get guidance', offsetDays: 21 },
    { title: 'Submit an expression of interest in ARENANet', offsetDays: 60 },
  ],
  stacking: [
    { with: 'rdti', note: 'Possible, but the grant can trigger an R&D Tax clawback adjustment. Get advice.' },
  ],
  content: {
    summary: 'Ongoing ARENA funding for renewable-energy projects. It only fits AI work with a clear renewable-energy link.',
    howToApply: [
      'Read the guidelines and check your project fits an ARENA investment focus area.',
      'Use "Tell us about your project" to engage ARENA before applying.',
      'Create an ARENANet account and submit an expression of interest with a project plan and conflict of interest declaration.',
      'If invited, submit a full application.',
    ],
    prepare: [
      'A clear link from your AI product to renewable energy supply or competitiveness',
      'A project plan following ARENA\'s guidance',
      'A project budget with sources and uses of funds',
      'A conflict of interest declaration',
    ],
    mistakes: [
      'Applying with general AI work that has no renewable-energy nexus',
      'Skipping the step of talking to ARENA first',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://arena.gov.au/funding/advancing-renewables-program/', title: 'Advancing Renewables Program (ARENA)', official: true },
    ],
  },
  changelog: [
    { date: '2026-10-26', note: 'Initial verified record' },
    { date: '2026-10-27', note: 'Application steps checked on the ARENA program page' },
  ],
};

export default program;
