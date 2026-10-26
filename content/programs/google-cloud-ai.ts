import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'google-cloud-ai',
  name: 'Google for Startups Cloud Program: AI (Scale)',
  provider: 'Google Cloud',
  level: 'industry',
  type: 'credits',
  benefit: { kind: 'credits', max: 350_000, currency: 'USD',
    note: 'Up to US$350K in Google Cloud credits over 2 years. Year 1 covers up to US$250K for AI-first startups; year 2 covers 20% of usage, up to US$100K more.' },
  status: { state: 'rolling', note: 'Apply any time. Acceptance is at Google Cloud\'s discretion.' },
  deadlines: [],
  gates: [
    { id: 'vc-funded', note: 'Crowdfunded rounds do not qualify' },
    { id: 'incorporated-within', months: 60 },
    { id: 'last-round-within', rules: [
      { stages: ['pre-seed', 'seed'], months: 60 },
      { stages: ['series-a'], months: 12 },
    ] },
    { id: 'prior-credits-max', provider: 'gcp', usd: 5_000 },
    { id: 'uses-stack', tech: 'gemini', note: 'Gemini must be a foundation of your primary product' },
    'product-company',
  ],
  scores: { funding: 5, value: 3, effort: 4, speed: 3 },
  personas: {
    bootstrapped: 'Not a fit yet: this tier needs institutional VC funding. Angel money, grants and crowdfunding do not count. Look at the Start tier.',
    'pre-raise': 'Becomes available once you close a VC-led pre-seed, seed or Series A round.',
  },
  goalTemplate: [
    { title: 'Confirm your round qualifies: VC-led, and within the time limit', offsetDays: 3 },
    { title: 'Document how Gemini is a foundation of the product', offsetDays: 7 },
    { title: 'Apply for the AI tier', offsetDays: 10 },
    { title: 'Plan year 2, when credits cover only 20% of usage', offsetDays: 300 },
  ],
  stacking: [
    { with: 'google-cloud-start', note: 'Start is for pre-funded startups. After a qualifying VC round, move up to this tier.' },
    { with: 'rdti', note: 'Claim only actual costs after credits. Do not claim the retail value of free services.' },
  ],
  content: {
    summary: 'Up to US$350K in Google Cloud credits over two years for VC-funded AI startups building on Gemini.',
    howToApply: [
      'Check your latest VC round: pre-seed or seed within 5 years, or Series A within 12 months.',
      'Check your prior Google Cloud credits are US$5K or less.',
      'Apply through the Google for Startups Cloud Program AI page.',
    ],
    prepare: [
      'Evidence of your institutional VC or SAFE round and its date',
      'A description of how Gemini underpins your primary product',
      'Your Google Cloud billing account ID and credit history',
      'A usage forecast for year 1 and year 2',
    ],
    mistakes: [
      'Counting angel, grant or crowdfunding money as qualifying funding',
      'Expecting credits to cover third-party models, which are billed directly',
      'Planning year 2 as if it were fully covered: it is 20% of usage',
    ],
    caveats: [],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://cloud.google.com/startup/ai', title: 'Google for Startups Cloud Program for AI startups', official: true },
    ],
  },
  exclusiveGroup: 'google-cloud',
  changelog: [
    { date: '2026-10-26', note: 'Initial verified record' },
    { date: '2026-10-27', note: 'Added the product-company check: the AI tier page excludes dev shops, consultancies and agencies' },
  ],
};

export default program;
