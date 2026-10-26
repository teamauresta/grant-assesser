import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'claude-startups',
  name: 'Claude for Startups',
  provider: 'Anthropic',
  level: 'industry',
  type: 'credits',
  benefit: { kind: 'credits', max: 100_000, currency: 'USD',
    note: 'Startups backed by a VC in Anthropic\'s partner network may get up to US$100K in API credits, claimed through the VC. Credits apply to the first-party Claude API only.' },
  status: { state: 'closed', note: 'Current cohort is full; not accepting new applications. VC-partner credits are claimed through your investor.' },
  deadlines: [],
  gates: [
    { id: 'product-company', severity: 'soft' },
  ],
  scores: { funding: 2, value: 3, effort: 5, speed: 4 },
  personas: {
    'vc-backed': 'Ask your VC whether they are in Anthropic\'s partner network. If so, the API credits are claimed through them, not by applying.',
  },
  goalTemplate: [
    { title: 'Subscribe to the Claude Startup newsletter for the next cohort', offsetDays: 3 },
    { title: 'Ask your investor whether they are an Anthropic partner VC', offsetDays: 7 },
  ],
  stacking: [
    { with: 'rdti', note: 'Claim only actual costs after credits. Do not claim the retail value of free services.' },
  ],
  content: {
    summary: 'Anthropic\'s program for early-stage founders building on Claude. The current cohort is full, but partner-VC startups can still get API credits through their investor.',
    howToApply: [
      'Subscribe to the Claude Startup newsletter to hear when applications reopen.',
      'If you are VC-backed, ask your investor whether they are in Anthropic\'s partner network.',
      'Claim partner credits through your VC.',
    ],
    prepare: [
      'A product built on the first-party Claude API',
      'Your investor\'s name and partner status',
      'A Claude Console account for your company',
    ],
    mistakes: [
      'Expecting credits to work on Claude through AWS, Google Cloud or Azure',
      'Planning around new applications while the cohort is full',
    ],
    caveats: [
      'Anthropic does not publish a product-company requirement; the program is for early-stage founders building on Claude. That check is soft here.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://claude.com/programs/startups', title: 'Claude for Startups program', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
