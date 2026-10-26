import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'cloudflare-startups',
  name: 'Cloudflare for Startups',
  provider: 'Cloudflare',
  level: 'industry',
  type: 'credits',
  benefit: { kind: 'credits', min: 5_000, max: 250_000, currency: 'USD',
    note: 'Tiered credits: US$5K (bootstrapped or stealth), US$25K (funded up to US$1M, with an active LinkedIn), US$100K (funded US$1M–5M with an approved VC or accelerator) and US$250K (high-growth AI or Tier-1 VC). Credits expire after 1 year.' },
  status: { state: 'rolling', note: 'Apply any time. Acceptance is at Cloudflare\'s discretion.' },
  deadlines: [],
  gates: [
    { id: 'incorporated-within', months: 60 },
    { id: 'funding-stage-before', stage: 'series-c-plus' },
    'has-website',
  ],
  scores: { funding: 2, value: 3, effort: 5, speed: 4 },
  personas: {
    bootstrapped: 'Start with the US$5K bootstrapped or stealth tier. With early adopters and an active LinkedIn page, you may fit the US$25K tier.',
    'pre-raise': 'The US$25K tier needs no VC partner: funding up to US$1M and an active LinkedIn page. The US$100K and US$250K tiers need an approved VC or accelerator partner.',
    'vc-backed': 'Check whether your VC or accelerator is one of Cloudflare\'s approved partners, or in its Tier-1 network for the US$250K tier.',
  },
  goalTemplate: [
    { title: 'Check whether your investor or accelerator is a Cloudflare partner', offsetDays: 3 },
    { title: 'Submit the Cloudflare for Startups form', offsetDays: 5 },
    { title: 'Note the 1-year expiry and set a usage alert', offsetDays: 20 },
  ],
  stacking: [
    { with: 'rdti', note: 'Claim only actual costs after credits. Do not claim the retail value of free services.' },
  ],
  content: {
    summary: 'Cloudflare credits from US$5K to US$250K depending on your funding and partners, for startups founded within 5 years.',
    howToApply: [
      'Sign up for a free Cloudflare account and add a valid credit card.',
      'Fill out the form with what you are building and your team.',
      'Wait for the automated confirmation email.',
      'Check your inbox again for confirmation that your startup account is active.',
    ],
    prepare: [
      'A valid website and matching business email address',
      'Founding date and funding stage',
      'Name of your VC or accelerator partner, if any',
      'A short description of what you are building',
    ],
    mistakes: [
      'Letting credits expire unused after the first year',
      'Forgetting your card is charged for usage beyond the credit limit',
    ],
    caveats: [],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.cloudflare.com/en-au/hatch/', title: 'Cloudflare for Startups', official: true },
    ],
  },
  changelog: [
    { date: '2026-10-26', note: 'Initial verified record' },
    { date: '2026-10-27', note: 'Corrected tier notes: the US$25K tier does not need a VC partner. Added the account and credit card step from the Cloudflare page' },
  ],
};

export default program;
