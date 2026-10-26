import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'google-cloud-start',
  name: 'Google for Startups Cloud Program: Start',
  provider: 'Google Cloud',
  level: 'industry',
  type: 'credits',
  benefit: { kind: 'credits', min: 2_000, max: 2_000, currency: 'USD',
    note: 'US$2K in Google Cloud credits, valid for 12 months, for pre-funded startups. The tier also lists 12 months of free Google Workspace Business Plus, which has its own conditions.' },
  status: { state: 'rolling', note: 'Apply any time. Acceptance is at Google Cloud\'s discretion.' },
  deadlines: [],
  gates: [
    { id: 'incorporated-within', months: 24 },
    'has-mvp',
    'product-company',
    { id: 'prior-credits-max', provider: 'gcp', usd: 0, note: 'Free-trial credits do not count; any other Google Cloud credits rule you out' },
  ],
  scores: { funding: 1, value: 3, effort: 5, speed: 4 },
  personas: {
    'vc-backed': 'Once you have institutional VC funding, look at the AI (Scale) tier instead, which offers far more.',
  },
  goalTemplate: [
    { title: 'Check billing history: no Google Cloud credits beyond the free trial', offsetDays: 2 },
    { title: 'If you want the free Workspace offer, check the domain has no paid Workspace plan', offsetDays: 2 },
    { title: 'Apply with your 18-character billing account ID', offsetDays: 5 },
    { title: 'Note the 12-month credit expiry', offsetDays: 20 },
  ],
  stacking: [
    { with: 'google-cloud-ai', note: 'Start is for pre-funded startups. After a qualifying VC round, the AI tier offers larger credits.' },
    { with: 'rdti', note: 'Claim only actual costs after credits. Do not claim the retail value of free services.' },
  ],
  content: {
    summary: 'US$2K in Google Cloud credits for young, pre-funded product startups with a working MVP.',
    howToApply: [
      'Confirm you were founded within the last 24 months and have a working MVP.',
      'Find your 18-character Google Cloud billing account ID.',
      'Apply through the Google for Startups Cloud Program Start page.',
    ],
    prepare: [
      'A working MVP and a clear business model',
      'Plans to seek venture funding',
      'Your 18-character Google Cloud billing account ID',
      'Billing history showing no credits beyond the free trial',
    ],
    mistakes: [
      'Assuming an existing Google Cloud project proves eligibility',
      'Expecting credits to cover third-party model charges',
      'Applying as a dev shop, consultancy or agency',
    ],
    caveats: [
      'The free Google Workspace Business Plus offer needs a company domain that is not on a paid Workspace plan and has not subscribed within 31 days of applying. Google lists this condition for the Workspace offer, not for the cloud credits. This tool does not check it.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://cloud.google.com/startup/pre-funded', title: 'Google for Startups Cloud Program: Start tier', official: true },
    ],
  },
  exclusiveGroup: 'google-cloud',
  changelog: [
    { date: '2026-10-26', note: 'Initial verified record' },
    { date: '2026-10-27', note: 'Corrected the Workspace caveat: the paid-Workspace exclusion applies to the free Workspace offer, not to the credits' },
  ],
};

export default program;
