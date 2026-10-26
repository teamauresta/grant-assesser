import type { ProgramInput } from '@/lib/schema';

const program: ProgramInput = {
  slug: 'press-play',
  name: 'Press Play AI Pre-Accelerator',
  provider: 'Press Play Ventures (backed by Innovation Victoria)',
  level: 'vic',
  type: 'accelerator',
  benefit: { kind: 'service', currency: 'AUD',
    note: 'Equity-free. 25 full scholarships for Victorian founders ($300 commitment fee, refunded on completion), plus 10 interstate places at $880.' },
  status: { state: 'open', note: 'Applications close 15 November 2026. The cohort runs from early February to 15 May 2027.' },
  deadlines: [
    { label: 'Applications close', kind: 'close', date: '2026-11-15' },
  ],
  gates: [
    'women-led',
    { id: 'state-is', state: 'vic', severity: 'soft',
      note: 'Interstate founders can take one of 10 places at $880; scholarships are for Victorians' },
  ],
  scores: { funding: 1, value: 4, effort: 3, speed: 3 },
  personas: {
    bootstrapped: 'No equity and a refundable fee: a low-risk way to test an AI idea before spending on it.',
  },
  goalTemplate: [
    { title: 'Choose your track: domain expert, technical expert or all-rounder', beforeDeadlineBusinessDays: 10 },
    { title: 'Write down the problem, who has it and why AI solves it', beforeDeadlineBusinessDays: 5 },
    { title: 'Submit the Press Play application', beforeDeadlineBusinessDays: 2 },
  ],
  stacking: [
    { with: 'victor-ai', note: 'Both are early-stage pre-accelerators. Pick the one whose timing and focus fit; avoid overlapping cohorts.' },
  ],
  content: {
    summary: 'A 12-week, equity-free AI pre-accelerator for women, with full scholarships for Victorian founders.',
    howToApply: [
      'Pick the track that matches your background.',
      'Apply online before 15 November 2026.',
      'If offered a Victorian scholarship, pay the $300 commitment fee, refunded when you complete the program.',
    ],
    prepare: [
      'A clear statement of the problem and who has it',
      'Why AI is the right way to solve it',
      'About 4–5 hours a week from February to May 2027',
    ],
    mistakes: [
      'Waiting for a polished idea: the program backs the thinking, not a finished product',
      'Leaving the application until the last day',
    ],
    caveats: [
      'No closing time is published, so the deadline here is the end of 15 November.',
    ],
  },
  verification: {
    lastVerified: '2026-10-26',
    sources: [
      { url: 'https://pressplay.ventures/', title: 'Press Play Ventures AI Pre-Accelerator', official: true },
    ],
  },
  changelog: [{ date: '2026-10-26', note: 'Initial verified record' }],
};

export default program;
