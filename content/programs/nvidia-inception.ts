import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'nvidia-inception',
  name: 'NVIDIA Inception',
  provider: 'NVIDIA',
  level: 'industry',
  type: 'service',
  benefit: { kind: 'service', currency: 'USD',
    note: 'Free membership with no fees or equity. No cash: partner cloud credits, preferred pricing on some NVIDIA hardware and software, and Deep Learning Institute courses.' },
  status: { state: 'rolling', note: 'No deadlines or cohorts. Apply at any funding stage.' },
  deadlines: [],
  gates: [
    { id: 'incorporated-within', months: 120, note: 'Members must be incorporated and less than 10 years old' },
    'has-website',
    'product-company',
  ],
  scores: { funding: 0, value: 4, effort: 5, speed: 3 },
  goalTemplate: [
    { title: 'Write down the specific NVIDIA benefit you will use', offsetDays: 3 },
    { title: 'Apply with your incorporation date and NVIDIA use case', offsetDays: 7 },
    { title: 'Request member benefits in the Inception portal', offsetDays: 30 },
  ],
  content: {
    summary: 'A free NVIDIA program for AI startups. It offers technical help, training and partner credits, not cash.',
    howToApply: [
      'Confirm you are incorporated, under 10 years old and have a working website.',
      'Apply online with your incorporation date, product and NVIDIA use case.',
      'Once accepted, request benefits in the Inception portal and keep your details current.',
    ],
    prepare: [
      'Incorporation date',
      'A working website',
      'A clear use case for NVIDIA technology',
      'Product explanation and funding information',
    ],
    mistakes: [
      'Presenting membership as investment or independent validation',
      'Expecting guaranteed GPU funding',
      'Applying as a consulting or outsourced development firm',
    ],
    caveats: [],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://www.nvidia.com/en-us/startups/', title: 'NVIDIA Inception program', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
