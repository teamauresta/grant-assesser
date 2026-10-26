import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'aws-activate-founders',
  name: 'AWS Activate Founders',
  provider: 'Amazon Web Services',
  level: 'industry',
  type: 'credits',
  benefit: { kind: 'credits', min: 1_000, max: 5_000, currency: 'USD',
    note: 'Starts at US$1K in AWS credits; select participants can qualify for up to US$5K. For self-funded startups without a provider Org ID.' },
  status: { state: 'rolling', note: 'Apply any time. AWS says you will hear back within 5–10 business days.' },
  deadlines: [],
  gates: [
    { id: 'incorporated-within', months: 120 },
    { id: 'funding-stage-before', stage: 'series-b' },
    { id: 'product-company', severity: 'soft' },
    'has-website',
  ],
  scores: { funding: 1, value: 3, effort: 5, speed: 4 },
  personas: {
    'vc-backed': 'If your investor or accelerator is an Activate Provider, apply for Activate Portfolio with their Org ID instead.',
  },
  goalTemplate: [
    { title: 'Create an AWS Builder ID and Activate profile with your business email', offsetDays: 2 },
    { title: 'Move the AWS account to a paid tier plan and link it', offsetDays: 3 },
    { title: 'Submit the Activate Founders application', offsetDays: 5 },
    { title: 'Note the credit expiry date and set a cost alert', offsetDays: 20 },
  ],
  stacking: [
    { with: 'rdti', note: 'Claim only actual costs after credits. Do not claim the retail value of free services.' },
  ],
  content: {
    summary: 'Small AWS credits for self-funded startups. Start with US$1K; some get up to US$5K.',
    howToApply: [
      'Create an AWS Builder ID and complete your Activate profile.',
      'Choose the Founders tier.',
      'Describe your product, funding stage and company.',
      'Link your AWS account (on a paid tier plan) and submit.',
    ],
    prepare: [
      'A fully functioning company website',
      'A business email address matching your startup\'s domain',
      'An AWS account on a paid tier plan',
      'Founding date and funding stage',
    ],
    mistakes: [
      'Linking the wrong AWS account or using a personal email domain',
      'Assuming you will get the maximum award',
      'Forgetting the expiry date and paying full price for usage afterwards',
    ],
    caveats: [
      'AWS does not publish a product-company or consultancy exclusion for Activate, so that check is soft here.',
      'The AWS application guide gives 7–10 business days for processing; the credits page says 5–10.',
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
