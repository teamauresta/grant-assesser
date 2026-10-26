import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'microsoft-for-startups',
  name: 'Microsoft for Startups',
  provider: 'Microsoft',
  level: 'industry',
  type: 'credits',
  benefit: { kind: 'credits', min: 0, max: 150_000, currency: 'USD',
    note: 'Azure credits that unlock over time, up to US$150K, as you show verified progress and sustained Azure usage. The headline is a ceiling, not an upfront award.' },
  status: { state: 'rolling', note: 'Apply any time. Applications are typically reviewed within about three business days.' },
  deadlines: [],
  gates: [
    'product-company',
    { id: 'funding-stage-before', stage: 'series-c-plus' },
    { id: 'prior-credits-max', provider: 'azure', usd: 350_000, note: 'The limit counts lifetime free Azure credits' },
  ],
  scores: { funding: 4, value: 3, effort: 5, speed: 5 },
  personas: {
    'vc-backed': 'If your investor is in the Microsoft for Startups Investor Network, ask for a referral code before you apply: it can unlock higher benefits earlier.',
  },
  goalTemplate: [
    { title: 'Check Azure fits your architecture or your customers\' environment', offsetDays: 3 },
    { title: 'Apply with company, product and funding details', offsetDays: 5 },
    { title: 'Set up the Azure account and activate the first credits', offsetDays: 10 },
    { title: 'Review credit usage and expiry; plan the next unlock', offsetDays: 60 },
  ],
  stacking: [
    { with: 'rdti', note: 'Claim only actual costs after credits. Do not claim the retail value of free services.' },
  ],
  content: {
    summary: 'Azure credits and startup support for companies that own a software product. Credits grow to as much as US$150K as you show progress.',
    howToApply: [
      'Apply at startups.microsoft.com with Get started.',
      'Enter an Investor Network referral code if you have one.',
      'Set up your Azure account; first credits are available while eligibility is checked.',
      'Unlock more credits over time through verified progress and Azure usage.',
    ],
    prepare: [
      'Company and product details, showing the software is owned by your company',
      'Your website and a business email address',
      'Funding stage and any investor referral code',
      'How much free Azure credit you have received before',
    ],
    mistakes: [
      'Forecasting future credit unlocks as secured runway',
      'Applying as a consultancy or agency rather than a product company',
      'Moving to Azure for credits without comparing migration cost with usable savings',
    ],
    caveats: [],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://learn.microsoft.com/en-us/startups/microsoft-for-startups/overview', title: 'What is Microsoft for Startups? (Microsoft Learn)', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
