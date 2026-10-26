import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'openai-startups',
  name: 'OpenAI for Startups (Australia)',
  provider: 'OpenAI',
  level: 'industry',
  type: 'credits',
  benefit: { kind: 'credits', max: 50_000, currency: 'USD',
    note: 'Reported, not confirmed on an official page: up to US$50K in API credits for eligible Australian startups.' },
  status: { state: 'unverified', note: 'The official page could not be fetched. Facts come from news reports (IT Brief, March and August 2026).' },
  deadlines: [],
  gates: [
    { id: 'product-company', severity: 'soft' },
  ],
  scores: { funding: 2, value: 3, effort: 4, speed: 3 },
  personas: {
    'vc-backed': 'OpenAI\'s Australian startups team has run events with VC firms. Ask your VC whether they can connect you.',
  },
  goalTemplate: [
    { title: 'Check openai.com/startups for current eligibility and how to apply', offsetDays: 3 },
    { title: 'Ask your investors or accelerator about OpenAI credit access', offsetDays: 7 },
  ],
  stacking: [
    { with: 'rdti', note: 'Claim only actual costs after credits. Do not claim the retail value of free services.' },
  ],
  content: {
    summary: 'OpenAI API credits for Australian startups, reported at up to US$50K. Eligibility and how to apply are not confirmed.',
    howToApply: [
      'Read the official startups page for current eligibility and the application route.',
      'Ask your VC or accelerator whether they can refer you.',
      'Follow the application route the official page gives; it is not confirmed here.',
    ],
    prepare: [
      'A product that uses, or will use, the OpenAI API',
      'Company and funding details',
      'An OpenAI platform account for your company',
    ],
    mistakes: [
      'Counting reported credit amounts as secured runway',
      'Relying on news coverage instead of the current official terms',
    ],
    caveats: [
      'All facts here are secondary. The official page returned an error to automated checks, so the amount, eligibility and application route are unconfirmed.',
      'This tool does not know whether the program requires VC backing. The product-company check is soft for that reason.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://openai.com/startups', title: 'OpenAI for Startups (could not be fetched)', official: true },
      { url: 'https://itbrief.com.au/story/openai-boosts-australian-startups-credits-to-usd-50-000', title: 'IT Brief: OpenAI boosts Australian startups credits to USD $50,000 (Mar 2026)', official: false },
      { url: 'https://itbrief.com.au/story/openai-gives-aud-5-5m-credits-to-australian-founders', title: 'IT Brief: OpenAI gives AUD $5.5m credits to Australian founders (Aug 2026)', official: false },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial record from secondary sources' }],
};

export default program;
