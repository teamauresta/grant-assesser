import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'aws-activate-portfolio',
  name: 'AWS Activate Portfolio',
  provider: 'Amazon Web Services',
  level: 'industry',
  type: 'credits',
  benefit: { kind: 'credits', max: 200_000, currency: 'USD',
    note: 'Up to US$200K in AWS credits through an Activate Provider (an accelerator, angel investor or VC firm). The amount depends on your provider\'s package. An invite-only AI tier of US$200K+ follows for startups ready to scale.' },
  status: { state: 'rolling', note: 'Apply any time with your provider\'s Org ID. AWS says you will hear back within 5–10 business days.' },
  deadlines: [],
  gates: [
    { id: 'incorporated-within', months: 120 },
    { id: 'funding-stage-before', stage: 'series-b' },
    { id: 'vc-or-accelerator', note: 'Activate Providers include accelerators, angel investors and VC firms' },
  ],
  scores: { funding: 3, value: 3, effort: 4, speed: 3 },
  personas: {
    bootstrapped: 'Without a provider Org ID, start with Activate Founders. Joining an accelerator that is an Activate Provider opens this tier.',
    'pre-raise': 'Ask prospective investors and accelerators whether they are Activate Providers and what package they offer.',
  },
  goalTemplate: [
    { title: 'Ask your investor or accelerator for their Activate Org ID and package', offsetDays: 3 },
    { title: 'Complete your Activate profile with your business email', offsetDays: 5 },
    { title: 'Submit the Portfolio application with the Org ID', offsetDays: 7 },
    { title: 'Note the credit expiry date and plan post-credit costs', offsetDays: 25 },
  ],
  stacking: [
    { with: 'aws-activate-founders', note: 'You can apply again for more than you received before; a new award usually covers only the difference.' },
    { with: 'rdti', note: 'Claim only actual costs after credits. Do not claim the retail value of free services.' },
  ],
  content: {
    summary: 'Larger AWS credits, up to US$200K, for startups backed by an AWS Activate Provider such as a VC or accelerator.',
    howToApply: [
      'Get the Organization ID (Org ID) from your Activate Provider.',
      'Create or sign in to your AWS Builder ID and complete your Activate profile.',
      'Choose the Portfolio tier and enter the Org ID.',
      'Link your AWS account and submit.',
    ],
    prepare: [
      'Your provider\'s Org ID (case-sensitive and confidential)',
      'A fully functioning company website and matching business email',
      'Founding date, funding stage and the date of your latest round',
      'Credits already received from AWS Activate',
    ],
    mistakes: [
      'Using an Org ID from a provider you no longer have an active relationship with',
      'Assuming the maximum award: packages vary by provider and stage',
      'Letting credits expire, then paying full rates for ongoing usage',
    ],
    caveats: [
      'AWS\'s guide says your most recent funding round must be within the last 12 months, if you have raised. This tool does not check that.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://aws.amazon.com/startups/credits', title: 'AWS Activate Credits', official: true },
      { url: 'https://aws.amazon.com/aws-startups/learn/applying-for-aws-activate-credits-a-step-by-step-guide/', title: 'Applying for AWS Activate Credits: a step-by-step guide', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
