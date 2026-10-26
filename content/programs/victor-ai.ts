import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'victor-ai',
  name: 'VICTOR:AI and the AI/DeepTech pre-accelerators',
  provider: 'Innovation Victoria-funded program operators',
  level: 'vic',
  type: 'accelerator',
  benefit: { kind: 'service', currency: 'AUD',
    note: 'Pre-accelerator programs for Victorian founders. VICTOR:AI (8 weeks) includes milestone-based grants for AI-native startups; amounts are not published.' },
  status: { state: 'unverified', note: 'Nine operators were funded up to $400K each (announced 18 June 2026). No intake dates are published; contact the operators.' },
  deadlines: [],
  gates: [
    { id: 'state-is', state: 'vic' },
  ],
  scores: { funding: 2, value: 4, effort: 3, speed: 3 },
  personas: {
    bootstrapped: 'A low-cost way to validate an AI idea with tools, co-working and milestone grants before you raise.',
  },
  goalTemplate: [
    { title: 'Shortlist two or three operators that fit your sector', offsetDays: 3 },
    { title: 'Email the operators to ask about intake dates and eligibility', offsetDays: 7 },
    { title: 'Prepare a one-page summary of your AI startup idea', offsetDays: 14 },
  ],
  stacking: [
    { with: 'press-play', note: 'Both are early-stage pre-accelerators. Pick the one whose timing and focus fit; avoid overlapping cohorts.' },
  ],
  content: {
    summary: 'A set of Victorian pre-accelerators for AI and deeptech founders, including VICTOR:AI, an 8-week program with milestone-based grants.',
    howToApply: [
      'Review the nine funded operators: Boab AI, Boson Ventures, Cicada Innovations, CoLabs Australia, HEX, Illume Ventures, Jumpstart Studio, MedTech Actuator and RMIT (DiscoveryHUB).',
      'Contact the operators directly: no intake dates are published centrally.',
      'Ask which program runs VICTOR:AI and when its next cohort opens.',
      'Apply through the operator\'s own process.',
    ],
    prepare: [
      'A short description of your AI-native product idea',
      'Evidence you are a Victorian founder',
      'The customer problem you want to validate',
      'Time to commit to an 8-week program',
    ],
    mistakes: [
      'Waiting for a central application round that may not exist',
      'Assuming every operator runs an AI-specific program',
    ],
    caveats: [
      'Intake dates, grant amounts and which operator delivers VICTOR:AI were not published when checked. Contact the operators directly.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://launchvic.org/announcements/victoria-backs-next-wave-of-ai-and-deeptech-founders/', title: 'LaunchVic: Victoria backs next wave of AI and DeepTech founders (18 Jun 2026)', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
